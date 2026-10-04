// @vitest-environment node
import { describe, expect, test } from "vitest";
import { rowToSubscription, toCents, type SubscriptionRow } from "./map-row";

const row: SubscriptionRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  name: "Notely",
  status: "confirmed",
  amount: 9.99,
  currency: "EUR",
  billing_cycle: "monthly",
  last_renewal_date: "2026-09-20",
  trial_ends: null,
  cancel_notice_days: null,
  regular_price: 19.9,
  promo_ends: "2026-12-01",
  access_until: null,
  category_id: "c1",
  payment_method_id: null,
  scope: "personal",
  confidence: "high",
  vendor: "Notely Inc",
  plan: null,
  account_label: "me@example.com",
  cancel_url: null,
  capture_id: null,
  notes: null,
  source: "seed",
  kept_for_cancel_by: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

const lookups = {
  categories: new Map([["c1", "Productivity"]]),
  paymentMethods: new Map<string, string>(),
};

describe("rowToSubscription", () => {
  test("maps snake_case to domain fields and converts money to cents", () => {
    const s = rowToSubscription(row, lookups);
    expect(s).toMatchObject({
      id: row.id,
      amountCents: 999,
      regularPriceCents: 1990,
      billingCycle: "monthly",
      lastRenewalDate: "2026-09-20",
      promoEnds: "2026-12-01",
      category: "Productivity",
      paymentMethod: null,
      source: "seed",
    });
    expect(s.accountLabel).toBe("me@example.com");
    expect(s).not.toHaveProperty("user_id");
    expect(s).not.toHaveProperty("userId");
  });

  test("keeps nulls as null", () => {
    const s = rowToSubscription(
      { ...row, amount: null, currency: null, regular_price: null, promo_ends: null, category_id: null },
      lookups,
    );
    expect(s.amountCents).toBeNull();
    expect(s.regularPriceCents).toBeNull();
    expect(s.category).toBeNull();
  });

  test("an unknown lookup id maps to null", () => {
    expect(rowToSubscription({ ...row, category_id: "gone" }, lookups).category).toBeNull();
  });
});

describe("toCents", () => {
  test("rounds float noise", () => {
    expect(toCents(0.29)).toBe(29);
    expect(toCents(1.005 * 100)).toBe(10050);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0)).toBe(0);
  });
});
