// Row-level isolation check against the hosted project. Run after every migration:
//   pnpm check-rls            (reads .env.local; accounts from RLS_* env vars or --accounts <json>)
// Accounts JSON (keep it in /local-data/, gitignored):
//   {"a":{"email":"...","password":"..."},"b":{"email":"...","password":"..."}}
// Both accounts need at least one subscription and one category (a `starter` seed does).
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { Database } from "../src/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
type Creds = { email: string; password: string };
const TABLES = [
  "profiles",
  "categories",
  "payment_methods",
  "subscriptions",
  "captures",
  "proposals",
  "subscription_events",
] as const;

let failures = 0;
function report(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : detail ? `  (${detail})` : ""}`);
}

function loadAccounts(): { a: Creds; b: Creds } {
  const i = process.argv.indexOf("--accounts");
  if (i !== -1) {
    const path = process.argv[i + 1];
    if (!path) throw new Error("--accounts needs a path");
    return JSON.parse(readFileSync(path, "utf8"));
  }
  const e = process.env;
  const need = ["RLS_A_EMAIL", "RLS_A_PASSWORD", "RLS_B_EMAIL", "RLS_B_PASSWORD"];
  const missing = need.filter((k) => !e[k]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")} (or use --accounts)`);
  return {
    a: { email: e.RLS_A_EMAIL!, password: e.RLS_A_PASSWORD! },
    b: { email: e.RLS_B_EMAIL!, password: e.RLS_B_PASSWORD! },
  };
}

function publicClient(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function userIdOf(admin: Db, email: string): Promise<string> {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`No user with email ${email}`);
}

async function main() {
  const { a, b } = loadAccounts();
  const admin = createAdminClient();
  const bId = await userIdOf(admin, b.email);
  const aId = await userIdOf(admin, a.email);

  const { data: bSubs, error: bSubErr } = await admin.from("subscriptions").select("id").eq("user_id", bId).limit(1);
  const { data: bCats, error: bCatErr } = await admin.from("categories").select("id").eq("user_id", bId).limit(1);
  if (bSubErr || bCatErr || !bSubs?.length || !bCats?.length) {
    throw new Error("Account B needs at least one subscription and one category");
  }
  const bSubId = bSubs[0].id;
  const bCatId = bCats[0].id;

  const { data: aCats } = await admin.from("categories").select("id").eq("user_id", aId).limit(1);
  const aCatId = aCats?.[0]?.id ?? null;
  const { data: aSubs } = await admin.from("subscriptions").select("id").eq("user_id", aId).limit(1);
  const aSubId = aSubs?.[0]?.id ?? null;

  // Anything the checks create is removed in `finally` (admin bypasses RLS).
  const createdIds: string[] = [];
  const captureIds: string[] = []; // deleting a capture cascades to its proposals
  const eventIds: string[] = [];

  try {
    const client = publicClient();
    const { error: signInErr } = await client.auth.signInWithPassword(a);
    if (signInErr) throw new Error(`Sign-in as A failed: ${signInErr.message}`);

    for (const t of TABLES) {
      const { data, error } = await client.from(t).select("*");
      const ownOnly = !error && !!data && data.every((r) => r.user_id === aId);
      report(`A sees only own rows in ${t}`, ownOnly, error?.message ?? "foreign rows returned");
    }

    {
      const { data, error } = await client.from("subscriptions").select("id").eq("id", bSubId);
      report("A cannot read B's subscription by id", !error && data?.length === 0, error?.message ?? `${data?.length} rows`);
    }
    {
      const { data, error } = await client.from("profiles").select("user_id").eq("user_id", bId);
      report("A cannot read B's profile", !error && data?.length === 0, error?.message ?? `${data?.length} rows`);
    }
    {
      const { data, error } = await client
        .from("subscriptions")
        .insert({ name: "rls-check", user_id: bId })
        .select("id");
      if (data?.length) createdIds.push(...data.map((r) => r.id));
      report("A cannot insert a subscription with user_id = B", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }

    if (aSubId) {
      {
        const { data, error } = await client
          .from("subscriptions")
          .update({ user_id: bId })
          .eq("id", aSubId)
          .select("id");
        report("A cannot move own subscription to user_id = B", !!error || data?.length === 0, "update succeeded");
      }
      {
        const { data, error } = await client
          .from("subscriptions")
          .update({ category_id: bCatId })
          .eq("id", aSubId)
          .select("id");
        report("A cannot set own subscription's category_id to B's category", !!error || data?.length === 0, "update succeeded");
      }
      {
        // D12: status changes only through set_subscription_status (guard trigger, errcode 42501).
        const { data: cur } = await admin.from("subscriptions").select("status").eq("id", aSubId).single();
        const flipped = cur?.status === "cancelled" ? "confirmed" : "cancelled";
        const { data, error } = await client.from("subscriptions").update({ status: flipped }).eq("id", aSubId).select("id");
        const { data: after } = await admin.from("subscriptions").select("status").eq("id", aSubId).single();
        report(
          "A cannot change own subscription's status with a plain update (42501)",
          error?.code === "42501" && !data?.length && after?.status === cur?.status,
          error ? `${error.code}: ${error.message}` : "update succeeded",
        );
      }
      {
        const { data, error } = await client.from("subscriptions").insert({ name: "rls-check-cancelled", status: "cancelled" }).select("id");
        if (data?.length) createdIds.push(...data.map((r) => r.id));
        report("A cannot insert a subscription with status cancelled (42501)", error?.code === "42501" && !data?.length, error ? `${error.code}: ${error.message}` : "insert succeeded");
      }
    } else {
      report("A has a subscription for the update checks", false, "seed account A first");
    }
    {
      const { data, error } = await client
        .from("subscriptions")
        .insert({ name: "rls-check", category_id: bCatId })
        .select("id");
      if (data?.length) createdIds.push(...data.map((r) => r.id));
      report("A cannot insert a subscription with B's category_id", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }
    {
      // Control: the same insert with A's own category must work, so the denials above are meaningful.
      if (aCatId) {
        const { data, error } = await client
          .from("subscriptions")
          .insert({ name: "rls-check-control", category_id: aCatId })
          .select("id");
        if (data?.length) createdIds.push(...data.map((r) => r.id));
        report("Control: A can insert with own category_id", !error && data?.length === 1, error?.message ?? "");
      }
    }

    // Review queue and cancellation events (fixtures are created by the admin client for A and B).
    const fixture = async (userId: string, subId: string | null) => {
      const cap = await admin.from("captures").insert({ user_id: userId, input: "seed", raw_text: "rls-check" }).select("id").single();
      if (cap.error) throw cap.error;
      captureIds.push(cap.data.id);
      const prop = await admin
        .from("proposals")
        .insert({ user_id: userId, capture_id: cap.data.id, name: "rls-check-proposal" })
        .select("id")
        .single();
      if (prop.error) throw prop.error;
      let eventId: string | null = null;
      if (subId) {
        const ev = await admin
          .from("subscription_events")
          .insert({ user_id: userId, subscription_id: subId, kind: "cancelled", occurred_on: "2026-01-01", channel: "other" })
          .select("id")
          .single();
        if (ev.error) throw ev.error;
        eventIds.push(ev.data.id);
        eventId = ev.data.id;
      }
      return { captureId: cap.data.id, proposalId: prop.data.id, eventId };
    };
    const bFix = await fixture(bId, bSubId);
    const aFix = await fixture(aId, aSubId);

    for (const [table, id, label] of [
      ["captures", bFix.captureId, "capture"],
      ["proposals", bFix.proposalId, "proposal"],
      ["subscription_events", bFix.eventId!, "event"],
    ] as const) {
      const { data, error } = await client.from(table).select("id").eq("id", id);
      report(`A cannot read B's ${label} by id`, !error && data?.length === 0, error?.message ?? `${data?.length} rows`);
    }
    {
      const { error } = await client.rpc("approve_proposal", { p_proposal_id: bFix.proposalId, p_fields: { name: "stolen" } });
      const { data } = await admin.from("proposals").select("status").eq("id", bFix.proposalId).single();
      report("A cannot approve B's proposal via rpc", !!error && data?.status === "pending", error ? `status ${data?.status}` : "rpc succeeded");
    }
    {
      await admin.from("proposals").update({ updates_subscription_id: bSubId }).eq("id", bFix.proposalId);
      const { data: hit } = await client
        .from("proposals")
        .update({ updates_subscription_id: null })
        .eq("id", bFix.proposalId)
        .eq("status", "pending")
        .select("id");
      const { data } = await admin.from("proposals").select("updates_subscription_id").eq("id", bFix.proposalId).single();
      report("A cannot detach (update) B's proposal", !hit?.length && data?.updates_subscription_id === bSubId, "detach succeeded");
    }
    {
      const { error } = await client.rpc("reject_proposal", { p_proposal_id: bFix.proposalId });
      const { data } = await admin.from("proposals").select("status").eq("id", bFix.proposalId).single();
      report("A cannot reject B's proposal via rpc", !!error && data?.status === "pending", error ? `status ${data?.status}` : "rpc succeeded");
    }
    {
      const { data: before } = await admin.from("subscriptions").select("status").eq("id", bSubId).single();
      const { error } = await client.rpc("set_subscription_status", {
        p_subscription_id: bSubId, p_status: before?.status === "cancelled" ? "confirmed" : "cancelled",
        p_occurred_on: "2026-01-01", p_channel: "other",
      });
      const { data: after } = await admin.from("subscriptions").select("status").eq("id", bSubId).single();
      report("A cannot call set_subscription_status on B's subscription", !!error && after?.status === before?.status, error ? "status changed" : "rpc succeeded");
    }
    {
      const { data, error } = await client
        .from("subscription_events")
        .insert({ user_id: bId, subscription_id: bSubId, kind: "cancelled", occurred_on: "2026-01-01", channel: "other" })
        .select("id");
      if (data?.length) eventIds.push(...data.map((r) => r.id));
      report("A cannot insert an event with user_id = B", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }
    {
      const { data, error } = await client
        .from("subscription_events")
        .insert({ subscription_id: bSubId, kind: "cancelled", occurred_on: "2026-01-01", channel: "other" })
        .select("id");
      if (data?.length) eventIds.push(...data.map((r) => r.id));
      report("A cannot insert an event on B's subscription", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }
    {
      const { data, error } = await client
        .from("proposals")
        .insert({ capture_id: bFix.captureId, name: "rls-check" })
        .select("id");
      report("A cannot insert a proposal on B's capture", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }
    if (aFix.eventId) {
      {
        const { data, error } = await client.from("subscription_events").update({ note: "tampered" }).eq("id", aFix.eventId).select("id");
        report("A cannot update own event (append-only)", !!error || !data?.length, "update succeeded");
      }
      {
        const { data, error } = await client.from("subscription_events").delete().eq("id", aFix.eventId).select("id");
        report("A cannot delete own event (append-only)", !!error || !data?.length, "delete succeeded");
      }
      {
        const { data } = await admin.from("subscription_events").select("id, note").eq("id", aFix.eventId).single();
        report("A's event is intact after the attempts", data?.note === null, "event changed or gone");
      }
    }
    {
      // Controls: A's own approve, reject-after-approve and status round trip work, so the denials above mean something.
      const { data: id, error } = await client.rpc("approve_proposal", {
        p_proposal_id: aFix.proposalId,
        p_fields: { name: "rls-check-approved", amount: "1.00", currency: "EUR", billing_cycle: "monthly", last_renewal_date: "2026-11-01" },
      });
      if (id) createdIds.push(id);
      report("Control: A can approve own proposal", !error && !!id, error?.message ?? "");
      const again = await client.rpc("approve_proposal", { p_proposal_id: aFix.proposalId, p_fields: { name: "twice" } });
      report("A cannot approve an already approved proposal", !!again.error, "second approval succeeded");
      if (id) {
        const sub = await admin.from("subscriptions").select("source, capture_id").eq("id", id).single();
        report("Approved subscription has source capture and its capture link", sub.data?.source === "capture" && sub.data?.capture_id === aFix.captureId, JSON.stringify(sub.data));
        const noChannel = await client.rpc("set_subscription_status", { p_subscription_id: id, p_status: "cancelled" });
        const cancel = await client.rpc("set_subscription_status", { p_subscription_id: id, p_status: "cancelled", p_occurred_on: "2026-10-01", p_channel: "email", p_reference: "RLS-1" });
        const same = await client.rpc("set_subscription_status", { p_subscription_id: id, p_status: "cancelled", p_occurred_on: "2026-10-01", p_channel: "email" });
        const reopen = await client.rpc("set_subscription_status", { p_subscription_id: id, p_status: "confirmed" });
        const evs = await admin.from("subscription_events").select("id, kind").eq("subscription_id", id);
        report(
          "Control: A can cancel and reopen own subscription, one event each",
          !cancel.error && !reopen.error && evs.data?.length === 2,
          `${cancel.error?.message ?? ""} ${reopen.error?.message ?? ""} events=${evs.data?.length}`,
        );
        report("Cancelling an already cancelled subscription is refused", !!same.error, "unchanged status accepted");
        report("Cancelling without a channel is refused", !!noChannel.error, "accepted");
      }
    }

    const anon = publicClient();
    {
      const fakeId = "00000000-0000-4000-8000-000000000000";
      const calls = {
        approve_proposal: await anon.rpc("approve_proposal", { p_proposal_id: fakeId, p_fields: {} }),
        reject_proposal: await anon.rpc("reject_proposal", { p_proposal_id: fakeId }),
        set_subscription_status: await anon.rpc("set_subscription_status", { p_subscription_id: fakeId, p_status: "confirmed" }),
      };
      for (const [name, res] of Object.entries(calls)) {
        report(`anon cannot execute ${name}`, res.error?.code === "42501", res.error?.message ?? "rpc succeeded");
      }
    }
    for (const t of TABLES) {
      const { data, error } = await anon.from(t).select("*");
      report(`anon gets no rows from ${t}`, !!error || (data?.length ?? 0) === 0, `${data?.length} rows`);
    }
  } finally {
    if (eventIds.length) await admin.from("subscription_events").delete().in("id", eventIds);
    if (captureIds.length) await admin.from("captures").delete().in("id", captureIds);
    if (createdIds.length) await admin.from("subscriptions").delete().in("id", createdIds);
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
