// §2.1 Next renewal: first renewal date on or after today (D1).
import { addDays, addMonthsClamped, compare, diffDays, monthsBetween } from "@/lib/dates/plain-date";
import {
  BILLING_CYCLES,
  CYCLE_STEP,
  type BillingCycle,
  type PlainDate,
  type SubscriptionCore,
} from "./types";

/** Maps free text to a cycle; anything unknown is null, never Monthly (D3, E16). */
export function parseBillingCycle(raw: string | null): BillingCycle | null {
  if (raw === null) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return (BILLING_CYCLES as readonly string[]).includes(key) ? (key as BillingCycle) : null;
}

export const isActiveTrial = (c: Pick<SubscriptionCore, "trialEnds">, today: PlainDate): boolean =>
  c.trialEnds !== null && compare(c.trialEnds, today) >= 0;

export function nextRenewal(core: SubscriptionCore, today: PlainDate): PlainDate | null {
  if (core.status === "cancelled") return null; // D6, E26
  if (isActiveTrial(core, today)) return core.trialEnds; // rule 1
  const { lastRenewalDate: anchor, billingCycle: cycle } = core;
  if (anchor === null || cycle === null) return null; // rule 2 (Needs update)
  if (compare(anchor, today) >= 0) return anchor; // rule 3 (D4)
  const step = CYCLE_STEP[cycle];
  if ("days" in step) {
    // rule 4: smallest n >= 1 with anchor + step*n >= today, no loop
    const n = Math.max(1, Math.ceil(diffDays(today, anchor) / step.days));
    return addDays(anchor, n * step.days);
  }
  // rule 5: estimate n from the month gap; clamping can land either side, so check n-1..n+1
  const est = Math.max(1, Math.ceil(monthsBetween(anchor, today) / step.months));
  for (const n of [est - 1, est, est + 1]) {
    if (n < 1) continue;
    const date = addMonthsClamped(anchor, n * step.months);
    if (compare(date, today) >= 0) return date;
  }
  return addMonthsClamped(anchor, (est + 2) * step.months); // unreachable in practice
}
