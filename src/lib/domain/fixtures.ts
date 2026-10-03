// Test helpers: a fully-null core with overrides, and a one-call compute.
import { computeSubscription } from "./compute";
import type { PlainDate, SubscriptionCore } from "./types";

export const core = (over: Partial<SubscriptionCore> = {}): SubscriptionCore => ({
  name: "Test Sub",
  status: "confirmed",
  amountCents: null,
  currency: null,
  billingCycle: null,
  lastRenewalDate: null,
  trialEnds: null,
  cancelNoticeDays: null,
  regularPriceCents: null,
  promoEnds: null,
  accessUntil: null,
  ...over,
});

export const calc = (over: Partial<SubscriptionCore>, today: PlainDate) => computeSubscription(core(over), today);
