// @vitest-environment node
import { describe, expect, it } from "vitest";
import { calc } from "./fixtures";
import { formatMoney, spendByCategory, totalsByCurrency } from "./totals";

const T = "2026-10-01";

describe("totals", () => {
  it("keeps unrounded cents; yearly is monthly x 12 (not 266.04)", () => {
    const t = totalsByCurrency([
      calc({ amountCents: 1000, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-15" }, T),
      calc({ amountCents: 200, currency: "EUR", billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10" }, T),
    ]);
    expect(t.EUR?.monthly).toBeCloseTo(1216.6667, 3);
    expect(t.EUR?.yearly).toBeCloseTo(14600, 6);
  });
  it("quarterly and yearly monthly equivalents", () => {
    const t = totalsByCurrency([
      calc({ amountCents: 6200, currency: "EUR", billingCycle: "quarterly", lastRenewalDate: "2026-09-15" }, T),
      calc({ amountCents: 24000, currency: "EUR", billingCycle: "yearly", lastRenewalDate: "2026-09-15" }, T),
    ]);
    expect(formatMoney(t.EUR?.monthly ?? 0, "EUR")).toBe("€40.67");
  });
  it("every 6 months is a sixth per month", () => {
    const t = totalsByCurrency([
      calc({ amountCents: 30000, currency: "EUR", billingCycle: "every_6_months", lastRenewalDate: "2026-09-15" }, T),
    ]);
    expect(t.EUR?.monthly).toBeCloseTo(5000, 6);
    expect(t.EUR?.yearly).toBeCloseTo(60000, 6);
  });
  it("skips rows missing amount, currency or cycle, and cancelled rows", () => {
    const t = totalsByCurrency([
      calc({ amountCents: null, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-15" }, T),
      calc({ amountCents: 100, currency: null, billingCycle: "monthly", lastRenewalDate: "2026-09-15" }, T),
      calc({ amountCents: 100, currency: "EUR", billingCycle: null, lastRenewalDate: "2026-09-15" }, T),
      calc({ amountCents: 100, currency: "EUR", billingCycle: "monthly", status: "cancelled" }, T),
    ]);
    expect(t).toEqual({});
  });
  it("formatMoney rounds only at display", () => {
    expect(formatMoney(2216.6667, "EUR")).toBe("€22.17");
    expect(formatMoney(26600, "USD")).toBe("$266.00");
  });
});

describe("spendByCategory", () => {
  it("sums monthly spend per category and currency, skipping trials and cancelled, largest first", () => {
    const m = { currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-15" } as const;
    const withCat = (category: string | null, r: Parameters<typeof calc>[0]) => {
      const c = calc(r, T);
      return { ...c, input: { ...c.input, category } };
    };
    const s = spendByCategory([
      withCat("AI", { ...m, amountCents: 1000 }),
      withCat("AI", { ...m, amountCents: 500 }),
      withCat("Insurance", { ...m, amountCents: 12000, billingCycle: "yearly" }),
      withCat(null, { ...m, amountCents: 3000 }),
      withCat("AI", { ...m, amountCents: 9900, status: "cancelled" }),
      withCat("AI", { ...m, amountCents: 9900, trialEnds: "2026-10-20", lastRenewalDate: null }),
      withCat("AI", { ...m, amountCents: 700, currency: "USD" }),
    ]);
    expect(s.EUR).toEqual([
      { category: null, monthly: 3000 },
      { category: "AI", monthly: 1500 },
      { category: "Insurance", monthly: 1000 },
    ]);
    expect(s.USD).toEqual([{ category: "AI", monthly: 700 }]);
  });
});
