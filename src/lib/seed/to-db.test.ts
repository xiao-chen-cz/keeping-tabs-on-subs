// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildSeed, SEED_CATEGORIES, SEED_PAYMENT_METHODS } from "./build-seed";
import { seedRowToInsert } from "./to-db";

const cats = new Map(SEED_CATEGORIES.map((n) => [n, `cat-${n}`]));
const pms = new Map(SEED_PAYMENT_METHODS.map((n) => [n, `pm-${n}`]));

describe("seedRowToInsert", () => {
  const rows = buildSeed("full", "2026-10-02");

  it("maps cents to 2dp numbers, names to ids, and marks source seed", () => {
    const ledger = rows.find((r) => r.key === 3)!;
    const ins = seedRowToInsert(ledger, "user-1", cats, pms);
    expect(ins).toMatchObject({
      user_id: "user-1", name: "The Daily Ledger", amount: 2, regular_price: 12, currency: "EUR",
      billing_cycle: "every_4_weeks", category_id: "cat-Content / Media", payment_method_id: "pm-Private account",
      scope: "personal", source: "seed", status: "confirmed",
    });
    expect(ins.id).toBeUndefined();
    expect(seedRowToInsert(rows.find((r) => r.key === 5)!, "u", cats, pms).amount).toBe(8.99);
  });

  it("leaves a null payment method null and rejects unknown lookups", () => {
    expect(seedRowToInsert(rows.find((r) => r.key === 7)!, "u", cats, pms).payment_method_id).toBeNull();
    expect(() => seedRowToInsert(rows[0]!, "u", new Map(), pms)).toThrow(/Unknown category/);
  });
});
