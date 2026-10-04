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
    { id: "a", name: "CodePilot Pro", vendor: null, currency: "USD" as const, status: "confirmed" as const },
    { id: "b", name: "Other", vendor: "CodePilot", currency: "USD" as const, status: "confirmed" as const },
    { id: "c", name: "Gone", vendor: null, currency: "EUR" as const, status: "cancelled" as const },
  ];
  it("matches name or vendor case-insensitively, trimmed, with spaces collapsed", () => {
    expect(matchExisting(draft({ name: "  codepilot   PRO " }), subs)).toBe("a");
    expect(matchExisting(draft({ name: "Something", vendor: "codepilot" }), subs)).toBe("b");
  });
  it("also compares the draft vendor against the subscription name", () => {
    expect(matchExisting(draft({ name: "x", vendor: "CodePilot Pro" }), subs)).toBe("a");
  });
  it("ignores the amount: same vendor, different amount still matches", () => {
    expect(matchExisting(draft({ name: "CodePilot Pro", amountCents: 2500 }), subs)).toBe("a");
    expect(matchExisting(draft({ name: "CodePilot Pro", amountCents: null }), subs)).toBe("a");
  });
  it("needs the same currency unless the draft has none", () => {
    expect(matchExisting(draft({ name: "CodePilot Pro", currency: "EUR" }), subs)).toBeNull();
    expect(matchExisting(draft({ name: "CodePilot Pro", currency: null }), subs)).toBe("a");
  });
  it("returns the first candidate sorted by name", () => {
    expect(matchExisting(draft({ name: "CodePilot Pro", vendor: "CodePilot" }), [subs[1], subs[0]])).toBe("a");
  });
  it("ignores cancelled subscriptions and empty names", () => {
    expect(matchExisting(draft({ name: "Gone", currency: "EUR" }), subs)).toBeNull();
    expect(matchExisting(draft({ name: null, vendor: null }), subs)).toBeNull();
  });
});
