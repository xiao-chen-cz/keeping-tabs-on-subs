// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existingSub, proposal } from "./review-fixtures";
import { applyAnswer, confidenceFlags, isAnswered, missingFromValues, proposalChanges, proposalFormValues } from "./review-values";
import { missingRequired } from "@/lib/domain/proposal";

describe("proposalFormValues", () => {
  it("new entry: blank form overlaid with the draft's non-null values, status confirmed", () => {
    const v = proposalFormValues(
      proposal({ name: "NoteForge", amountCents: 799, currency: "EUR", lastRenewalDate: "2026-10-31" }),
      null,
    );
    expect(v).toMatchObject({ name: "NoteForge", amount: "7.99", currency: "EUR", last_renewal_date: "2026-10-31", billing_cycle: "", status: "confirmed" });
  });

  it("update proposal: existing values overlaid with non-null proposal values, nulls keep the existing value", () => {
    const existing = { subscription: existingSub(), categoryId: "cat1", paymentMethodId: "pm1" };
    const v = proposalFormValues(
      proposal({ name: "CodePilot Pro", amountCents: 1900, currency: "EUR", lastRenewalDate: "2026-10-03", updatesSubscriptionId: "s1" }),
      existing,
    );
    expect(v.last_renewal_date).toBe("2026-10-03"); // overlaid
    expect(v.billing_cycle).toBe("monthly"); // proposal had null: kept
    expect(v.notes).toBe("Team seat");
    expect(v.vendor).toBe("CodePilot");
    expect(v.category_id).toBe("cat1");
    expect(v.payment_method_id).toBe("pm1");
    expect(v.cancel_url).toBe("https://example.com/cancel");
  });

  it("update proposal: a non-null proposal value wins over the existing one", () => {
    const v = proposalFormValues(
      proposal({ name: "CodePilot Pro", amountCents: 2100, currency: "EUR", notes: "From receipt" }),
      { subscription: existingSub(), categoryId: null, paymentMethodId: null },
    );
    expect(v.amount).toBe("21.00");
    expect(v.notes).toBe("From receipt");
  });
});

describe("questions", () => {
  it("equal missingRequired for a new entry", () => {
    const p = proposal({ name: "Gymbox", amountCents: 3000 });
    expect(missingFromValues(proposalFormValues(p, null))).toEqual(missingRequired(p.draft));
    expect(missingFromValues(proposalFormValues(p, null))).toEqual(["currency", "billingCycle", "lastRenewalDate|trialEnds"]);
  });

  it("a trial end satisfies the date question", () => {
    const v = proposalFormValues(proposal({ name: "X", amountCents: 1, currency: "EUR", billingCycle: "monthly", trialEnds: "2026-10-10" }), null);
    expect(missingFromValues(v)).toEqual([]);
  });

  it("update proposals are not asked what the existing subscription already has", () => {
    const v = proposalFormValues(proposal({ name: "CodePilot Pro", amountCents: 1900, currency: "EUR" }), {
      subscription: existingSub(),
      categoryId: null,
      paymentMethodId: null,
    });
    expect(missingFromValues(v)).toEqual([]);
  });

  it("applyAnswer fills the mapped field; amounts must parse to count as answered", () => {
    const base = proposalFormValues(proposal({}), null);
    expect(applyAnswer(base, "billingCycle", "yearly").billing_cycle).toBe("yearly");
    expect(isAnswered(applyAnswer(base, "amountCents", "abc"), "amountCents")).toBe(false);
    expect(isAnswered(applyAnswer(base, "amountCents", "9,99"), "amountCents")).toBe(true);
    expect(isAnswered(applyAnswer(base, "lastRenewalDate|trialEnds", "2026-10-31"), "lastRenewalDate|trialEnds")).toBe(true);
  });
});

describe("confidenceFlags", () => {
  it("keeps only low and medium, mapped to form fields", () => {
    expect(confidenceFlags({ amountCents: "high", billingCycle: "medium", category: "low", name: "low" })).toEqual({
      billing_cycle: "medium",
      category_id: "low",
      name: "low",
    });
  });
});

describe("proposalChanges", () => {
  const sub = existingSub({ amountCents: 2000, currency: "USD", billingCycle: "monthly", lastRenewalDate: "2026-09-29" });
  it("reports a price rise in the danger tone", () => {
    expect(proposalChanges(proposal({ amountCents: 2500, currency: "USD" }), sub)).toEqual([
      { key: "amount", label: "Price", from: "$20.00", to: "$25.00", tone: "rise" },
    ]);
  });
  it("reports a price drop as neutral", () => {
    expect(proposalChanges(proposal({ amountCents: 1500, currency: "USD" }), sub)[0]).toMatchObject({ to: "$15.00", tone: "neutral" });
  });
  it("reports cycle and billing date changes, ignoring nulls and equal values", () => {
    const c = proposalChanges(proposal({ amountCents: 2000, billingCycle: "yearly", lastRenewalDate: "2026-10-01" }), sub);
    expect(c.map((x) => [x.key, x.from, x.to])).toEqual([
      ["cycle", "Monthly", "Yearly"],
      ["billingDate", "29 Sep", "1 Oct"],
    ]);
    expect(proposalChanges(proposal({}), sub)).toEqual([]);
  });
});
