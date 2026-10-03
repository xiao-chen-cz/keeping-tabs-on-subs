// @vitest-environment node
import { describe, expect, it } from "vitest";
import { priceRises, renewalAmountCents } from "./pricing";

const p = (amountCents: number | null, regularPriceCents: number | null, promoEnds: string | null) => ({
  amountCents,
  regularPriceCents,
  promoEnds,
});

describe("pricing", () => {
  it("regular price applies from the promo end, not before", () => {
    expect(renewalAmountCents(p(200, 1200, "2026-10-08"), "2026-10-08")).toBe(1200);
    expect(renewalAmountCents(p(200, 1200, "2026-10-09"), "2026-10-08")).toBe(200);
    expect(renewalAmountCents(p(200, 1200, "2026-01-01"), "2026-10-08")).toBe(1200);
  });
  it("needs a next renewal to apply the promo", () => {
    expect(renewalAmountCents(p(200, 1200, "2026-01-01"), null)).toBe(200);
  });
  it("null amount gives null", () => {
    expect(renewalAmountCents(p(null, 1200, "2026-01-01"), "2026-10-08")).toBeNull();
  });
  it("priceRises compares cents; equal and drops are false", () => {
    expect(priceRises(100, 101)).toBe(true);
    expect(priceRises(100, 100)).toBe(false);
    expect(priceRises(100, 50)).toBe(false);
    expect(priceRises(null, 100)).toBeNull();
    expect(priceRises(100, null)).toBeNull();
  });
});
