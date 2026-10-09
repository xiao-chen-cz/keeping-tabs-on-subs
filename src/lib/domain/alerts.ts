// logic-spec §3.2 Reminders (D10). Pure: "today" is already baked into the computed rows.
import type { AlertMode, ComputedSubscription, PlainDate, SubscriptionCore } from "./types";

export const DEFAULT_ALERT_OFFSETS = [3, 1, 0] as const;

/** A row may carry the cancel-by date the user tapped Keep for (E29, E32) and its alert mode (D13, default Remind). */
export type AlertSource = SubscriptionCore & { keptForCancelBy?: PlainDate | null; alertMode?: AlertMode };

/** Quarterly, Every 6 months and Yearly: Keep quietly still sends one reminder per renewal (D13). */
function isLongCycle(cycle: SubscriptionCore["billingCycle"]): boolean {
  return cycle === "quarterly" || cycle === "every_6_months" || cycle === "yearly";
}

/**
 * The offsets that apply to this row (D13). Remind: the user's offsets. Keep quietly: none for Monthly /
 * Every 4 weeks, only the largest for longer cycles (Quarterly, Every 6 months, Yearly); but every offset while a price rise is known or a
 * trial is active (E38-E42, E48).
 */
export function effectiveOffsets<T extends AlertSource>(row: ComputedSubscription<T>, offsets: number[]): number[] {
  const { input, computed: c } = row;
  if (input.alertMode !== "quiet" || c.priceRises === true || c.tags.trial) return offsets;
  if (offsets.length === 0) return [];
  return isLongCycle(input.billingCycle) ? [Math.max(...offsets)] : [];
}

export interface DueAlert {
  offset: number;
  cancelBy: PlainDate;
  daysLeft: number;
  priceRise: { fromCents: number; toCents: number } | null;
}

/**
 * The smallest offset the row has reached (daysLeft <= offset), or null when it is not alert-eligible
 * (cancelled, no cancel-by, Needs update, Kept for this cancel-by, deadline passed, or above every offset).
 * Several offsets reached at once collapse to the smallest (E30).
 */
function reachedOffset<T extends AlertSource>(row: ComputedSubscription<T>, offsets: number[]) {
  const { input, computed: c } = row;
  if (input.status !== "confirmed" || c.tags.needsUpdate) return null;
  if (c.cancelBy === null || c.daysUntilCancelBy === null) return null;
  if (input.keptForCancelBy === c.cancelBy) return null; // Keep is valid only for this cancel-by
  const left = c.daysUntilCancelBy;
  if (left < 0) return null; // E31
  const reached = effectiveOffsets(row, offsets).filter((o) => left <= o);
  if (reached.length === 0) return null;
  return { offset: Math.min(...reached), cancelBy: c.cancelBy, daysLeft: left };
}

/** The alert currently due for display in the app, or null. */
export function dueAlert<T extends AlertSource>(row: ComputedSubscription<T>, offsets: number[]): DueAlert | null {
  const hit = reachedOffset(row, offsets);
  if (!hit) return null;
  const { input, computed: c } = row;
  const priceRise =
    c.priceRises === true && input.amountCents !== null && c.renewalAmountCents !== null
      ? { fromCents: input.amountCents, toCents: c.renewalAmountCents }
      : null;
  return { ...hit, priceRise };
}

/**
 * For the email job: the single offset to send now, or null. `alreadySent` lists offsets already sent
 * for the row's CURRENT cancel-by date only; a changed cancel-by resets it (§3.2 Rules).
 */
export function alertsToSend<T extends AlertSource>(
  row: ComputedSubscription<T>,
  offsets: number[],
  alreadySent: number[],
): number | null {
  const hit = reachedOffset(row, offsets);
  return hit && !alreadySent.includes(hit.offset) ? hit.offset : null;
}

/** Rows with a due alert, most urgent first, then by name. */
export function dueSoon<T extends AlertSource>(
  rows: ComputedSubscription<T>[],
  offsets: number[],
): { row: ComputedSubscription<T>; alert: DueAlert }[] {
  return rows
    .flatMap((row) => {
      const alert = dueAlert(row, offsets);
      return alert ? [{ row, alert }] : [];
    })
    .sort(
      (a, b) =>
        a.alert.daysLeft - b.alert.daysLeft ||
        a.row.input.name.localeCompare(b.row.input.name, undefined, { sensitivity: "base" }),
    );
}

export type KeepCheck = "ok" | "stale" | "not_active";

/**
 * Whether a Keep for `cancelBy` still applies to the row (E47): a Keep from an old email, or after the
 * Cancel-by moved (E32), is refused instead of silencing the wrong renewal.
 */
export function checkKeep<T extends SubscriptionCore>(row: ComputedSubscription<T>, cancelBy: PlainDate): KeepCheck {
  if (row.input.status !== "confirmed") return "not_active";
  return row.computed.cancelBy === cancelBy ? "ok" : "stale";
}

/**
 * After a Keep: offer "Keep quietly" once (D13, E44). `keptCount` includes the Keep just made.
 */
export function shouldOfferQuiet(
  sub: { alertMode: AlertMode; quietOfferShownAt: string | null },
  keptCount: number,
): boolean {
  return sub.alertMode === "remind" && sub.quietOfferShownAt === null && keptCount >= 2;
}

function daysList(offsets: number[]): string {
  const d = [...offsets].sort((a, b) => b - a).map(String);
  return d.length <= 1 ? (d[0] ?? "") : `${d.slice(0, -1).join(", ")} and ${d[d.length - 1]}`;
}

/** Plain-language summary of a mode for a row's cycle (detail page, D13). Ignores price rises and trials. */
export function describeReminders(mode: AlertMode, cycle: SubscriptionCore["billingCycle"], offsets: number[]): string {
  if (offsets.length === 0) return "No reminders.";
  if (mode === "remind") return `Reminders ${daysList(offsets)} days before the cancel-by.`;
  if (isLongCycle(cycle)) return `One reminder, ${Math.max(...offsets)} days before the cancel-by.`;
  return "No routine reminders.";
}
