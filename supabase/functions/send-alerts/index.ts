// Daily alert email (logic-spec §3.2, D14; plan specs/todo/d21-23-alerts.md Part C). Started by pg_cron
// with the x-cron-secret header. For every user with email alerts on: at most one email, only when a row
// reached a new offset. Rows are claimed in alert_sends before sending, so a rerun or an overlapping run
// never sends twice (E46); a failed send releases its claims for the next run.
//
// Secrets (Edge Function secrets, never in git): BREVO_API_KEY, CRON_SECRET, APP_URL, ALERTS_FROM_EMAIL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
// POST ?dry=1 returns what would be sent without sending or recording.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildDigest, renderDigestEmail, rowToSubscription, sentKey, todayIn } from "./shared.bundle.js";

const NO_LOOKUPS = { categories: new Map<string, string>(), paymentMethods: new Map<string, string>() };

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
}

/** Constant-time compare, so the secret cannot be guessed byte by byte. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

type UserReport = { user: string; sent?: number; would?: { name: string; offset: number }[]; skipped?: string; error?: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!sameSecret(req.headers.get("x-cron-secret") ?? "", env("CRON_SECRET"))) return new Response("Unauthorized", { status: 401 });

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const appUrl = env("APP_URL").replace(/\/+$/, "");
  const sender = { name: "Keeping Tabs on Subs", email: env("ALERTS_FROM_EMAIL") };
  const apiKey = env("BREVO_API_KEY");

  const { data: profiles, error: pErr } = await db
    .from("profiles")
    .select("user_id, time_zone, reminder_offsets")
    .eq("alert_channel", "app_email");
  if (pErr) return Response.json({ ok: false, error: pErr.message }, { status: 500 });

  const report: UserReport[] = [];
  for (const p of profiles) {
    const user = p.user_id.slice(0, 8); // enough to find the user in logs, without the address
    try {
      const { data: u, error: uErr } = await db.auth.admin.getUserById(p.user_id);
      if (uErr) throw uErr;
      const email = u.user?.email;
      if (!email) {
        report.push({ user, skipped: "no email" });
        continue;
      }
      const [subs, sends] = await Promise.all([
        db.from("subscriptions").select("*").eq("user_id", p.user_id).eq("status", "confirmed"),
        db.from("alert_sends").select("subscription_id, cancel_by, alert_offset").eq("user_id", p.user_id),
      ]);
      if (subs.error) throw subs.error;
      if (sends.error) throw sends.error;

      const sent = new Map<string, number[]>();
      for (const s of sends.data) {
        const k = sentKey(s.subscription_id, s.cancel_by);
        sent.set(k, [...(sent.get(k) ?? []), s.alert_offset]);
      }
      const today = todayIn(p.time_zone, new Date());
      const items = buildDigest(
        subs.data.map((r) => rowToSubscription(r, NO_LOOKUPS)),
        p.reminder_offsets,
        sent,
        today,
      );
      if (items.length === 0) {
        report.push({ user, sent: 0 });
        continue;
      }
      if (dry) {
        report.push({ user, would: items.map((i) => ({ name: i.name, offset: i.offset })) });
        continue;
      }

      // Claim first: the unique (subscription, cancel-by, offset) makes a second run fail here, not send twice.
      const { data: claimed, error: cErr } = await db
        .from("alert_sends")
        .insert(items.map((i) => ({ user_id: p.user_id, subscription_id: i.subscriptionId, cancel_by: i.cancelBy, alert_offset: i.offset })))
        .select("id");
      if (cErr) {
        if (cErr.code === "23505") {
          report.push({ user, skipped: "already claimed" });
          continue;
        }
        throw cErr;
      }
      const ids = claimed.map((c) => c.id);

      const mail = renderDigestEmail(items, appUrl);
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender,
          to: [{ email }],
          subject: mail.subject,
          htmlContent: mail.html,
          textContent: mail.text,
          tags: ["alerts"],
        }),
      });
      if (!res.ok) {
        await db.from("alert_sends").delete().in("id", ids);
        throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const { messageId } = (await res.json()) as { messageId?: string };
      if (messageId) await db.from("alert_sends").update({ email_id: messageId }).in("id", ids);
      report.push({ user, sent: items.length });
    } catch (e) {
      report.push({ user, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return Response.json({ ok: true, dry, report });
});
