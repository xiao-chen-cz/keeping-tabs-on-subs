// What a "Needs update" row still lacks before it can get a next renewal again. Pure.
// Keys are the ones questions.ts uses, so its fixed questions can be reused as they are.
import type { RequiredField } from "./proposal";
import type { SubscriptionCore } from "./types";

/**
 * Fields to ask for, in order: amount, currency, cycle, billing date. The date question fills the billing
 * date (last_renewal_date), never the trial end: an expired trial does not give the row a schedule, and an
 * active trial would mean the row is not Needs update at all. `today` is accepted for symmetry with the
 * other domain functions and for a future rule; the answer does not depend on it today.
 */
export function missingForSchedule(sub: SubscriptionCore): RequiredField[] {
  const out: RequiredField[] = [];
  if (sub.amountCents === null) out.push("amountCents");
  if (sub.currency === null) out.push("currency");
  if (sub.billingCycle === null) out.push("billingCycle");
  if (sub.lastRenewalDate === null) out.push("lastRenewalDate|trialEnds");
  return out;
}

/** Link target for a list row: Needs update rows go to the completion screen, the rest to the detail page. */
export function subscriptionHref(id: string, needsUpdate: boolean): string {
  return needsUpdate ? `/subscriptions/${id}/complete` : `/subscriptions/${id}`;
}

/** Cancel form prefill for "the trial ended and I didn't continue": the trial end if not in the future, else today. */
export function trialEndedPrefill(trialEnds: string | null, today: string) {
  return {
    channel: "other",
    note: "Trial ended without converting",
    occurredOn: trialEnds !== null && trialEnds <= today ? trialEnds : today,
  };
}
