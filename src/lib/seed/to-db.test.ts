// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildSeed, SEED_CATEGORIES, SEED_PAYMENT_METHODS } from "./build-seed";
import { buildSeedProposals } from "./proposals";
import { seedCaptureToInsert, seedProposalToInsert, seedRowToInsert } from "./to-db";

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

describe("seedProposalToInsert", () => {
  const props = buildSeedProposals("full", "2026-10-02");

  it("maps P1 to a pending proposal insert with confidence json and no id", () => {
    const ins = seedProposalToInsert(props[0]!, "user-1", "cap-1", null, cats, pms);
    expect(ins).toMatchObject({
      user_id: "user-1", capture_id: "cap-1", name: "NoteForge", amount: 12, currency: "USD",
      billing_cycle: "monthly", last_renewal_date: "2026-10-30", category_id: null,
      cancel_url: "https://noteforge.example/billing", updates_subscription_id: null,
      field_confidence: { amountCents: "high", billingCycle: "medium", category: "low" },
    });
    expect(ins.id).toBeUndefined();
    expect(ins.status).toBeUndefined();
  });

  it("keeps a sparse P3 sparse and links P2 to the resolved subscription id", () => {
    const p3 = seedProposalToInsert(props[2]!, "u", "c", null, cats, pms);
    expect(p3).toMatchObject({ name: "Gymbox", amount: 39, currency: null, billing_cycle: null, last_renewal_date: null });
    expect(seedProposalToInsert(props[1]!, "u", "c", "sub-1", cats, pms).updates_subscription_id).toBe("sub-1");
  });

  it("maps a capture to a seed-input insert", () => {
    const ins = seedCaptureToInsert(props[0]!.capture, props[0]!.captureDate, "user-1");
    expect(ins).toMatchObject({ user_id: "user-1", input: "seed", mime_type: "text/plain" });
    expect(ins.raw_text).toContain("NoteForge");
  });
});
