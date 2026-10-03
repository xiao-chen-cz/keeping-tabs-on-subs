// @vitest-environment node
import { describe, expect, it } from "vitest";
import { core } from "./fixtures";
import { nextRenewal, parseBillingCycle } from "./schedule";

describe("parseBillingCycle", () => {
  it("accepts keys and labels, rejects unknown (E16)", () => {
    expect(parseBillingCycle("Monthly")).toBe("monthly");
    expect(parseBillingCycle("Every 4 weeks")).toBe("every_4_weeks");
    expect(parseBillingCycle("every_4_weeks")).toBe("every_4_weeks");
    expect(parseBillingCycle("Trial")).toBeNull();
    expect(parseBillingCycle("Biweekly")).toBeNull();
    expect(parseBillingCycle(null)).toBeNull();
  });
});

describe("nextRenewal", () => {
  const monthly = (f: string) => core({ billingCycle: "monthly", lastRenewalDate: f });
  it("quarterly steps from the anchor, clamped", () => {
    expect(nextRenewal(core({ billingCycle: "quarterly", lastRenewalDate: "2026-11-30" }), "2027-02-01")).toBe("2027-02-28");
    expect(nextRenewal(core({ billingCycle: "quarterly", lastRenewalDate: "2026-11-30" }), "2027-03-01")).toBe("2027-05-30");
  });
  it("monthly over a year boundary and many months later", () => {
    expect(nextRenewal(monthly("2025-12-15"), "2026-01-16")).toBe("2026-02-15");
    expect(nextRenewal(monthly("2020-01-31"), "2026-10-01")).toBe("2026-10-31");
    expect(nextRenewal(monthly("2020-01-31"), "2026-11-01")).toBe("2026-11-30");
  });
  it("every 4 weeks never drifts to monthly", () => {
    const c = core({ billingCycle: "every_4_weeks", lastRenewalDate: "2026-01-01" });
    expect(nextRenewal(c, "2026-01-02")).toBe("2026-01-29");
    expect(nextRenewal(c, "2026-12-31")).toBe("2026-12-31"); // 1 Jan + 28 * 13, today counts
    expect(nextRenewal(c, "2027-01-01")).toBe("2027-01-28");
  });
  it("unknown anchor or cycle gives null", () => {
    expect(nextRenewal(core({ billingCycle: "monthly" }), "2026-10-01")).toBeNull();
    expect(nextRenewal(core({ lastRenewalDate: "2026-09-01" }), "2026-10-01")).toBeNull();
  });
  it("a trial beats the schedule; a cancelled row beats a trial", () => {
    const c = { ...monthly("2026-09-01"), trialEnds: "2026-10-10" };
    expect(nextRenewal(c, "2026-10-01")).toBe("2026-10-10");
    expect(nextRenewal({ ...c, status: "cancelled" }, "2026-10-01")).toBeNull();
  });
});
