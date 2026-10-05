// The daily alert email (logic-spec §3.2, D14): which rows go into today's email for one user, and the
// email itself. Pure: the Supabase function (supabase/functions/send-alerts) does the I/O and uses this
// through a bundle (pnpm bundle:alerts). No server-only or React imports here.
import { formatDay, relativeDays } from "@/components/format";
import { alertsToSend, dueAlert } from "@/lib/domain/alerts";
import { computeSubscription } from "@/lib/domain/compute";
import { formatMoney } from "@/lib/domain/totals";
import type { PlainDate, Subscription } from "@/lib/domain/types";

export interface DigestItem {
  subscriptionId: string;
  name: string;
  accountLabel: string | null;
  offset: number;
  cancelBy: PlainDate;
  daysLeft: number;
  nextRenewal: PlainDate | null;
  /** "€2.00", or null without amount. */
  amount: string | null;
  /** Set when the price rises at this renewal: "€10.00" -> "€15.00". */
  priceRise: { from: string; to: string } | null;
  cancelUrl: string | null;
}

/** Offsets already emailed for a row's current cancel-by (alert_sends), keyed `${subscriptionId}|${cancelBy}`. */
export type SentOffsets = ReadonlyMap<string, number[]>;
export const sentKey = (subscriptionId: string, cancelBy: PlainDate) => `${subscriptionId}|${cancelBy}`;

/**
 * Rows that reached a new offset today and have not been emailed for it (E30, E40, E46). Kept, cancelled,
 * Needs update and quiet rows follow the same rules as Due soon. Most urgent first, then by name.
 */
export function buildDigest(subscriptions: Subscription[], offsets: number[], sent: SentOffsets, today: PlainDate): DigestItem[] {
  const items: DigestItem[] = [];
  for (const s of subscriptions) {
    const row = computeSubscription(s, today);
    const alert = dueAlert(row, offsets);
    if (!alert) continue;
    const offset = alertsToSend(row, offsets, sent.get(sentKey(s.id, alert.cancelBy)) ?? []);
    if (offset === null) continue;
    const money = (cents: number | null) => (cents !== null && s.currency !== null ? formatMoney(cents, s.currency) : null);
    items.push({
      subscriptionId: s.id,
      name: s.name,
      accountLabel: s.accountLabel,
      offset,
      cancelBy: alert.cancelBy,
      daysLeft: alert.daysLeft,
      nextRenewal: row.computed.nextRenewal,
      amount: money(row.computed.renewalAmountCents),
      priceRise: alert.priceRise
        ? { from: money(alert.priceRise.fromCents) ?? "", to: money(alert.priceRise.toCents) ?? "" }
        : null,
      cancelUrl: s.cancelUrl,
    });
  }
  return items.sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Only http(s) links from user data reach the email. */
const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

export function alertLink(appUrl: string, item: Pick<DigestItem, "subscriptionId" | "cancelBy">, action: "keep" | "cancel") {
  return `${appUrl}/alerts/${encodeURIComponent(item.subscriptionId)}?cb=${item.cancelBy}&do=${action}`;
}

function when(item: DigestItem): string {
  return `cancel by ${formatDay(item.cancelBy)} (${relativeDays(item.daysLeft)})`;
}

function price(item: DigestItem): string | null {
  return item.priceRise ? `${item.priceRise.from} → ${item.priceRise.to} (price rises)` : item.amount;
}

/** One email for the day's items (E46). The app name is always written in full. */
export function renderDigestEmail(items: DigestItem[], appUrl: string): { subject: string; html: string; text: string } {
  const first = items[0];
  const subject =
    items.length === 1
      ? `${first.name}: cancel by ${formatDay(first.cancelBy)}`
      : `${items.length} subscriptions to decide on, first by ${formatDay(first.cancelBy)}`;
  const intro = "Decide before the cancel-by date. If you do nothing, they renew.";
  const settings = `${appUrl}/settings`;

  const text = [
    "Keeping Tabs on Subs",
    "",
    intro,
    "",
    ...items.flatMap((it) => [
      `${it.name}${it.accountLabel ? ` (${it.accountLabel})` : ""}`,
      [when(it), it.nextRenewal ? `renews ${formatDay(it.nextRenewal)}` : null, price(it)].filter(Boolean).join(" · "),
      `Keep it: ${alertLink(appUrl, it, "keep")}`,
      `I cancelled it: ${alertLink(appUrl, it, "cancel")}`,
      ...(safeUrl(it.cancelUrl) ? [`Vendor's cancel page: ${safeUrl(it.cancelUrl)}`] : []),
      "",
    ]),
    `You get this because email alerts are on. Switch to in-app only: ${settings}`,
  ].join("\n");

  const button = (href: string, label: string, primary = false) =>
    `<a href="${escape(href)}" style="display:inline-block;padding:8px 14px;margin:4px 6px 0 0;border-radius:8px;font-size:14px;text-decoration:none;${
      primary ? "background:#0f3d56;color:#ffffff;" : "border:1px solid #cfd6dc;color:#1c2b33;"
    }">${escape(label)}</a>`;

  const rows = items
    .map((it) => {
      const meta = [when(it), it.nextRenewal ? `renews ${formatDay(it.nextRenewal)}` : null, price(it)].filter(Boolean) as string[];
      const vendor = safeUrl(it.cancelUrl);
      return `<tr><td style="padding:14px 0;border-top:1px solid #e3e8ec;">
<div style="font-size:16px;font-weight:600;color:#1c2b33;">${escape(it.name)}${
        it.accountLabel ? ` <span style="font-weight:400;color:#5b6b75;">(${escape(it.accountLabel)})</span>` : ""
      }</div>
<div style="font-size:14px;color:${it.priceRise ? "#a3271f" : "#5b6b75"};margin-top:2px;">${meta.map(escape).join(" · ")}</div>
<div style="margin-top:6px;">${button(alertLink(appUrl, it, "keep"), "Keep it", true)}${button(alertLink(appUrl, it, "cancel"), "I cancelled it")}${
        vendor ? button(vendor, "Vendor's cancel page") : ""
      }</div>
</td></tr>`;
    })
    .join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:24px 16px;background:#f6f8f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:20px;">
<tr><td style="font-size:18px;font-weight:600;color:#0f3d56;padding-bottom:4px;">Keeping Tabs on Subs</td></tr>
<tr><td style="font-size:14px;color:#5b6b75;padding-bottom:6px;">${escape(intro)}</td></tr>
${rows}
<tr><td style="font-size:12px;color:#5b6b75;padding-top:16px;border-top:1px solid #e3e8ec;">You get this because email alerts are on. <a href="${escape(settings)}" style="color:#5b6b75;">Switch to in-app only</a>.</td></tr>
</table></body></html>`;

  return { subject, html, text };
}
