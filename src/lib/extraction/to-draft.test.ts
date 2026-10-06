// @vitest-environment node
// Recorded model outputs (fixtures/, from `pnpm extract:live --sample … --today 2026-10-02 --save …`)
// and hand-made bad outputs. No live calls.
import { describe, expect, it } from "vitest";
import { missingRequired } from "@/lib/domain/proposal";
import { buildSeed } from "@/lib/seed/build-seed";
import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from "@/lib/seed/sets";
import codepilot from "./fixtures/codepilot-receipt.text.json";
import gymbox from "./fixtures/gymbox-invoice.text.json";
import noteforge from "./fixtures/noteforge-billing.text.json";
import gymboxPdf from "./fixtures/gymbox-invoice.file.json";
import noteforgePng from "./fixtures/noteforge-billing.file.json";
import readloop from "./fixtures/readloop-trial-email.text.json";
import { extractionSchema, type Extraction } from "./schema";
import { extractionToDraft, lowerConfidence, redactPaymentNumbers, type DraftContext } from "./to-draft";

const T = "2026-10-02";
const full = buildSeed("full", T);
const ctx: DraftContext = { categories: SEED_CATEGORIES, paymentMethods: SEED_PAYMENT_METHODS, subscriptions: full };
const empty: DraftContext = { ...ctx, subscriptions: [] };

const recorded = (f: { output: unknown }): Extraction => extractionSchema.parse(f.output);

const blank: Extraction = {
  is_subscription: true, name: null, vendor: null, plan: null, account_label: null, amount: null, currency: null,
  billing_cycle: null, last_charge_date: null, next_charge_date: null, trial_ends: null, regular_price: null,
  promo_ends: null, cancel_notice_days: null, cancel_url: null, payment_method_label: null, category: null,
  category_confidence: null, scope: null, scope_confidence: null,
  field_confidence: { name: null, amount: null, currency: null, billing_cycle: null, date: null }, notes: null,
};

describe("recorded sample captures", () => {
  it("fixtures were recorded on the test date", () => {
    for (const f of [codepilot, gymbox, noteforge, readloop, noteforgePng, gymboxPdf]) expect(f.today).toBe(T);
  });

  it("NoteForge screenshot (vision): same proposal as the text, the bare link gets https, 'Card on file' is no nickname", () => {
    const d = extractionToDraft(recorded(noteforgePng), ctx);
    expect(d).toMatchObject({
      name: "NoteForge", amountCents: 1200, currency: "USD", billingCycle: null, lastRenewalDate: "2026-10-30",
      cancelUrl: "https://noteforge.example/billing", paymentMethod: null,
    });
    expect(missingRequired(d)).toEqual(["billingCycle"]);
  });

  it("Gymbox PDF: name and amount only", () => {
    const d = extractionToDraft(recorded(gymboxPdf), ctx);
    expect(d).toMatchObject({ name: "Gymbox", amountCents: 3900, currency: null, billingCycle: null, lastRenewalDate: null });
  });

  it("NoteForge billing page: new entry, the stated next charge is the anchor, only the cycle is asked (P1)", () => {
    const d = extractionToDraft(recorded(noteforge), ctx);
    expect(d).toMatchObject({
      name: "NoteForge", amountCents: 1200, currency: "USD", billingCycle: null, lastRenewalDate: "2026-10-30",
      cancelUrl: "https://noteforge.example/billing", updatesSubscriptionId: null,
    });
    expect(missingRequired(d)).toEqual(["billingCycle"]);
  });

  it("CodePilot receipt: update of #1 (me@example.com, not #13), price change, name kept, scope from the payment method (P2)", () => {
    const d = extractionToDraft(recorded(codepilot), ctx);
    const one = full.find((r) => r.key === 1)!;
    expect(d.updatesSubscriptionId).toBe(one.id);
    expect(d).toMatchObject({ name: "CodePilot Pro", amountCents: 2500, lastRenewalDate: "2026-09-29", paymentMethod: "Business account" });
    // #1 already has category, scope and confidence: never overwritten (§4 rule 1).
    expect([d.category, d.scope, d.confidence]).toEqual([null, null, null]);
  });

  it("CodePilot receipt as a new user: Business from the payment method's other uses is not available, model scope stays", () => {
    const d = extractionToDraft(recorded(codepilot), empty);
    expect(d.updatesSubscriptionId).toBeNull();
    expect(d.name).toBe("CodePilot");
  });

  it("Gymbox sparse invoice: name and amount only (P3)", () => {
    const d = extractionToDraft(recorded(gymbox), ctx);
    expect(d).toMatchObject({ name: "Gymbox", amountCents: 3900, currency: null, billingCycle: null, lastRenewalDate: null });
    expect(missingRequired(d)).toEqual(["currency", "billingCycle", "lastRenewalDate|trialEnds"]);
  });

  it("ReadLoop trial email: a trial, no anchor (the trial end is the next charge)", () => {
    const d = extractionToDraft(recorded(readloop), ctx);
    expect(d).toMatchObject({ name: "ReadLoop", amountCents: 699, currency: "EUR", billingCycle: "monthly", trialEnds: "2026-10-05", lastRenewalDate: null });
    expect(missingRequired(d)).toEqual([]);
  });
});

describe("code enforces the rules, whatever the model says", () => {
  it("drops impossible dates, bad amounts and non-http links", () => {
    const d = extractionToDraft(
      { ...blank, name: "X", amount: "12,5O", last_charge_date: "2026-02-30", trial_ends: "next week", cancel_url: "javascript:alert(1)" },
      empty,
    );
    expect([d.amountCents, d.lastRenewalDate, d.trialEnds, d.cancelUrl]).toEqual([null, null, null, null]);
    expect(extractionToDraft({ ...blank, cancel_url: "ftp://files.example/x" }, empty).cancelUrl).toBeNull();
    expect(extractionToDraft({ ...blank, cancel_url: "Settings > Subscription" }, empty).cancelUrl).toBeNull();
  });

  it("keeps regular price and promo end only together (§4 rule 9)", () => {
    expect(extractionToDraft({ ...blank, regular_price: "20.00" }, empty)).toMatchObject({ regularPriceCents: null, promoEnds: null });
    expect(extractionToDraft({ ...blank, regular_price: "20.00", promo_ends: "2027-01-01" }, empty)).toMatchObject({
      regularPriceCents: 2000, promoEnds: "2027-01-01",
    });
  });

  it("a last charge wins over a stated next charge; a next charge alone becomes the anchor (A3)", () => {
    expect(extractionToDraft({ ...blank, last_charge_date: "2026-09-01", next_charge_date: "2026-10-01" }, empty).lastRenewalDate).toBe("2026-09-01");
    expect(extractionToDraft({ ...blank, next_charge_date: "2026-10-30" }, empty).lastRenewalDate).toBe("2026-10-30");
  });

  it("keeps only known categories and payment method nicknames (§4 rules 2, 8)", () => {
    const d = extractionToDraft(
      { ...blank, category: "ai", category_confidence: "high", payment_method_label: "Visa •••• 4242" },
      empty,
    );
    expect(d.category).toBe("AI");
    expect(d.paymentMethod).toBeNull();
    expect(extractionToDraft({ ...blank, category: "Gaming" }, empty).category).toBeNull();
  });

  it("removes card numbers and IBANs from free text (§4 rule 7)", () => {
    const d = extractionToDraft({ ...blank, notes: "Paid with 4111 1111 1111 1111 from DE89 3704 0044 0532 0130 00." }, empty);
    expect(d.notes).not.toMatch(/4111|3704/);
    expect(redactPaymentNumbers("Order 12345, total 12.00")).toBe("Order 12345, total 12.00");
  });

  it("confidence is the lower of category and scope (§4 rule 6); a missing one counts as low", () => {
    expect(lowerConfidence("high", "medium")).toBe("medium");
    expect(lowerConfidence("high", null)).toBe("low");
    expect(lowerConfidence(null, null)).toBeNull();
    const d = extractionToDraft({ ...blank, category: "AI", category_confidence: "high", scope: "business", scope_confidence: "high" }, empty);
    expect(d.confidence).toBe("high");
  });

  it("marks a capture that is not a subscription in the notes", () => {
    expect(extractionToDraft({ ...blank, is_subscription: false }, empty).notes).toBe("This does not look like a subscription.");
  });

  it("records field confidence only for fields that survived", () => {
    const d = extractionToDraft(
      { ...blank, name: "X", amount: "oops", field_confidence: { name: "high", amount: "high", currency: null, billing_cycle: null, date: null } },
      empty,
    );
    expect(d.fieldConfidence).toEqual({ name: "high" });
  });
});
