// @vitest-environment node
// The five D10 sample cases (specs/subscription-rules.md), checked against specs/seed-data.md
// "What a tester sees". Today 2026-10-02; anchors chosen so Next renewal lands on the seed offsets.
import { describe, expect, it } from "vitest";
import { computeSubscription } from "./compute";
import { missingRequired } from "./proposal";
import { parseAnswer, questionsFor } from "./questions";
import { formatMoney, totalsByCurrency } from "./totals";
import type { Subscription, SubscriptionCore, SubscriptionDraft } from "./types";
import { groupAndSort } from "./upcoming";

const T = "2026-10-02";

const sub = (over: Partial<Subscription> & Pick<Subscription, "id" | "name">): Subscription => ({
  status: "confirmed", amountCents: null, currency: null, billingCycle: null, lastRenewalDate: null,
  trialEnds: null, cancelNoticeDays: null, regularPriceCents: null, promoEnds: null, accessUntil: null,
  vendor: null, plan: null, accountLabel: null, category: null, paymentMethod: null, scope: null, confidence: "high",
  cancelUrl: null, notes: null, source: "seed", keptForCancelBy: null, alertMode: "remind", quietOfferShownAt: null, ...over,
});

const codePilot = sub({ id: "1", name: "CodePilot Pro", amountCents: 2000, currency: "USD", billingCycle: "monthly", lastRenewalDate: "2026-09-29" }); // next +27
const notely = sub({ id: "2", name: "Notely Teams", amountCents: 24000, currency: "EUR", billingCycle: "yearly", lastRenewalDate: "2026-04-15", cancelNoticeDays: 30 }); // next +195 = 2027-04-15
const ledger = sub({ id: "3", name: "The Daily Ledger", amountCents: 200, currency: "EUR", billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10", regularPriceCents: 1200, promoEnds: "2027-07-29" }); // next +6, promo +300
const voiceDraft = sub({ id: "4", name: "VoiceDraft Pro", amountCents: 12000, currency: "USD", billingCycle: "yearly", lastRenewalDate: "2025-10-12", regularPriceCents: 20000, promoEnds: "2026-10-12" }); // next +10

const rows = [codePilot, notely, ledger, voiceDraft].map((s) => computeSubscription(s, T));
const byName = (n: string) => {
  const r = rows.find((x) => x.input.name === n);
  if (!r) throw new Error(n);
  return r.computed;
};

describe("starter set at 2026-10-02", () => {
  it("next renewals and notice", () => {
    expect(byName("CodePilot Pro")).toMatchObject({ nextRenewal: "2026-10-29", daysUntilRenewal: 27, cancelBy: "2026-10-26", daysUntilCancelBy: 24 });
    expect(byName("Notely Teams")).toMatchObject({ nextRenewal: "2027-04-15", daysUntilRenewal: 195, noticeDays: 30, noticeIsDefault: false, cancelBy: "2027-03-16", daysUntilCancelBy: 165 });
    expect(byName("The Daily Ledger")).toMatchObject({ nextRenewal: "2026-10-08", daysUntilRenewal: 6, cancelBy: "2026-10-05", daysUntilCancelBy: 3 });
    expect(byName("VoiceDraft Pro")).toMatchObject({ nextRenewal: "2026-10-12", daysUntilRenewal: 10, cancelBy: "2026-10-05", daysUntilCancelBy: 3 });
  });

  it("price rise: VoiceDraft 120 to 200 yes, Daily Ledger no", () => {
    expect(byName("VoiceDraft Pro")).toMatchObject({ renewalAmountCents: 20000, priceRises: true });
    expect(byName("The Daily Ledger")).toMatchObject({ renewalAmountCents: 200, priceRises: false });
    expect(byName("CodePilot Pro").priceRises).toBe(false);
  });

  it("order: Daily Ledger, VoiceDraft, CodePilot, Notely", () => {
    expect(groupAndSort(rows).upcoming.map((r) => r.input.name)).toEqual([
      "The Daily Ledger", "VoiceDraft Pro", "CodePilot Pro", "Notely Teams",
    ]);
  });

  it("totals per currency", () => {
    const t = totalsByCurrency(rows);
    expect(formatMoney(t.EUR?.monthly ?? 0, "EUR")).toBe("€22.17");
    expect(formatMoney(t.EUR?.yearly ?? 0, "EUR")).toBe("€266.00");
    expect(formatMoney(t.USD?.monthly ?? 0, "USD")).toBe("$30.00");
    expect(formatMoney(t.USD?.yearly ?? 0, "USD")).toBe("$360.00");
  });
});

describe("P1 NoteForge proposal", () => {
  const draft: SubscriptionDraft = {
    name: "NoteForge", vendor: null, plan: null, accountLabel: null, category: null, paymentMethod: null, scope: null, confidence: null,
    amountCents: 1200, currency: "USD", billingCycle: null, // the billing page does not state the cycle
    lastRenewalDate: "2026-10-30", // stated next renewal, stored as a future anchor (D4)
    trialEnds: null, cancelNoticeDays: null, regularPriceCents: null, promoEnds: null, accessUntil: null,
    cancelUrl: "https://noteforge.example/billing", notes: null,
    fieldConfidence: { amountCents: "high", category: "low" },
    updatesSubscriptionId: null,
  };

  it("keeps unknowns null and asks exactly one question: the billing cycle", () => {
    expect([draft.billingCycle, draft.cancelNoticeDays, draft.category, draft.scope, draft.paymentMethod]).toEqual([null, null, null, null, null]);
    expect(draft.fieldConfidence).toEqual({ amountCents: "high", category: "low" });
    const missing = missingRequired(draft);
    expect(missing).toEqual(["billingCycle"]);
    expect(questionsFor(missing).map((q) => q.field)).toEqual(["billingCycle"]);
  });

  it("computes the next renewal from the stated date once the tester answers Monthly", () => {
    const billingCycle = parseAnswer("billingCycle", "Monthly");
    expect(billingCycle).toBe("monthly");
    const core: SubscriptionCore = { ...draft, name: draft.name ?? "", billingCycle: "monthly", status: "confirmed" };
    const { computed } = computeSubscription(core, T);
    expect(computed).toMatchObject({ nextRenewal: "2026-10-30", daysUntilRenewal: 28, noticeDays: 3, cancelBy: "2026-10-27", anchorInFuture: true });
    expect(computed.tags.needsUpdate).toBe(false);
  });
});
