// Test fixtures for the review screen. Fictional data only.
import type { Proposal } from "@/lib/dal/map-proposal";
import { core } from "@/lib/domain/fixtures";
import type { Subscription, SubscriptionDraft } from "@/lib/domain/types";

export const blankDraft: SubscriptionDraft = {
  name: null, amountCents: null, currency: null, billingCycle: null, lastRenewalDate: null,
  trialEnds: null, cancelNoticeDays: null, regularPriceCents: null, promoEnds: null, accessUntil: null,
  vendor: null, plan: null, accountLabel: null, category: null, paymentMethod: null, scope: null, confidence: null,
  cancelUrl: null, notes: null, fieldConfidence: {}, updatesSubscriptionId: null,
};

export function proposal(draft: Partial<SubscriptionDraft>, over: Partial<Proposal> = {}): Proposal {
  return {
    id: "p1",
    status: "pending",
    captureId: "c1",
    draft: { ...blankDraft, ...draft },
    categoryId: null,
    paymentMethodId: null,
    subscriptionId: null,
    decidedAt: null,
    createdAt: "2026-10-03T10:00:00Z",
    ...over,
  };
}

export function existingSub(over: Partial<Subscription> = {}): Subscription {
  return {
    ...core({ name: "CodePilot Pro", amountCents: 1900, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-03" }),
    id: "s1",
    vendor: "CodePilot",
    plan: "Pro",
    accountLabel: null,
    category: "Software",
    paymentMethod: null,
    scope: "business",
    confidence: "high",
    cancelUrl: "https://example.com/cancel",
    notes: "Team seat",
    source: "seed",
    keptForCancelBy: null,
    ...over,
  };
}
