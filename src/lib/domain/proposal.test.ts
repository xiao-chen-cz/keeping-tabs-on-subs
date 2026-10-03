// @vitest-environment node
import { describe, expect, it } from "vitest";
import { matchExisting, missingRequired } from "./proposal";
import type { SubscriptionDraft } from "./types";

const draft = (over: Partial<SubscriptionDraft> = {}): SubscriptionDraft => ({
  name: "NoteForge", amountCents: 1200, currency: "USD", billingCycle: "monthly",
  lastRenewalDate: "2026-11-01", trialEnds: null, cancelNoticeDays: null, regularPriceCents: null,
  promoEnds: null, accessUntil: null, vendor: null, plan: null, category: null, paymentMethod: null,
  scope: null, confidence: null, cancelUrl: null, notes: null, fieldConfidence: {},
  updatesSubscriptionId: null, ...over,
});

describe("missingRequired", () => {
  it("is empty for a complete draft", () => {
    expect(missingRequired(draft())).toEqual([]);
  });
  it("accepts a trial end as the date", () => {
    expect(missingRequired(draft({ lastRenewalDate: null, trialEnds: "2026-10-20" }))).toEqual([]);
  });
  it("lists every missing field in the fixed order", () => {
    expect(
      missingRequired(draft({ name: " ", amountCents: null, currency: null, billingCycle: null, lastRenewalDate: null })),
    ).toEqual(["name", "amountCents", "currency", "billingCycle", "lastRenewalDate|trialEnds"]);
  });
  it("treats an amount of 0 as present", () => {
    expect(missingRequired(draft({ amountCents: 0 }))).toEqual([]);
  });
});

describe("matchExisting", () => {
  const subs = [
    { id: "a", name: "CodePilot Pro", vendor: null, amountCents: 2000, currency: "USD" as const, status: "confirmed" as const },
    { id: "b", name: "Other", vendor: "CodePilot", amountCents: 2000, currency: "USD" as const, status: "confirmed" as const },
    { id: "c", name: "Gone", vendor: null, amountCents: 500, currency: "EUR" as const, status: "cancelled" as const },
  ];
  it("matches name or vendor case-insensitively after trimming, with the same amount and currency", () => {
    expect(matchExisting(draft({ name: "  codepilot PRO ", amountCents: 2000 }), subs)).toBe("a");
    expect(matchExisting(draft({ name: "Something", vendor: "codepilot", amountCents: 2000 }), subs)).toBe("b");
  });
  it("needs the same amount and currency", () => {
    expect(matchExisting(draft({ name: "CodePilot Pro", amountCents: 2100 }), subs)).toBeNull();
    expect(matchExisting(draft({ name: "CodePilot Pro", amountCents: 2000, currency: "EUR" }), subs)).toBeNull();
    expect(matchExisting(draft({ name: "CodePilot Pro", amountCents: null }), subs)).toBeNull();
  });
  it("ignores cancelled subscriptions and empty names", () => {
    expect(matchExisting(draft({ name: "Gone", amountCents: 500, currency: "EUR" }), subs)).toBeNull();
    expect(matchExisting(draft({ name: null, vendor: null }), subs)).toBeNull();
  });
});
