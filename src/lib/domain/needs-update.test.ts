// @vitest-environment node
import { describe, expect, it } from "vitest";
import { core } from "./fixtures";
import { missingForSchedule, subscriptionHref } from "./needs-update";


describe("missingForSchedule", () => {
  it("seed PixelStock (no cycle, trial ended 5 days ago, no anchor): cycle and billing date", () => {
    const sub = core({ name: "PixelStock", amountCents: 999, currency: "USD", trialEnds: "2026-09-29" });
    expect(missingForSchedule(sub)).toEqual(["billingCycle", "lastRenewalDate|trialEnds"]);
  });
  it("only a missing anchor: billing date only", () => {
    const sub = core({ amountCents: 500, currency: "EUR", billingCycle: "monthly" });
    expect(missingForSchedule(sub)).toEqual(["lastRenewalDate|trialEnds"]);
  });
  it("keeps the order amount, currency, cycle, date", () => {
    expect(missingForSchedule(core())).toEqual([
      "amountCents",
      "currency",
      "billingCycle",
      "lastRenewalDate|trialEnds",
    ]);
  });
  it("nothing missing", () => {
    const sub = core({ amountCents: 1, currency: "EUR", billingCycle: "yearly", lastRenewalDate: "2026-01-01" });
    expect(missingForSchedule(sub)).toEqual([]);
  });
});

describe("subscriptionHref", () => {
  it("sends Needs update rows to /complete, others to the detail page", () => {
    expect(subscriptionHref("abc", true)).toBe("/subscriptions/abc/complete");
    expect(subscriptionHref("abc", false)).toBe("/subscriptions/abc");
  });
});
