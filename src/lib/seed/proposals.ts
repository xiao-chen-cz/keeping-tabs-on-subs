// Seed proposals P1-P3 (specs/seed-data.md, review queue). Fictional. Pure: offsets + injected today.
// No model call: these stand in for extraction output.
import { addDays } from "@/lib/dates/plain-date";
import type { PlainDate, SubscriptionDraft } from "@/lib/domain/types";
import { buildSeed, type SeedSet } from "./build-seed";
import { CODEPILOT_RECEIPT, GYMBOX_INVOICE, NOTEFORGE_BILLING, type SeedCapture } from "./captures";

export interface SeedProposal {
  key: "P1" | "P2" | "P3";
  capture: SeedCapture;
  /** The date the capture text is built from (next charge, charge date). */
  captureDate: PlainDate;
  /** Draft with updatesSubscriptionId null; resolve updatesSeedKey to the inserted row at seed time. */
  draft: SubscriptionDraft;
  /** Seed subscription key (#1 = CodePilot Pro) this proposal updates, or null for a new entry. */
  updatesSeedKey: number | null;
}

const blank: SubscriptionDraft = {
  name: null, amountCents: null, currency: null, billingCycle: null, lastRenewalDate: null,
  trialEnds: null, cancelNoticeDays: null, regularPriceCents: null, promoEnds: null, accessUntil: null,
  vendor: null, plan: null, category: null, paymentMethod: null, scope: null, confidence: null,
  cancelUrl: null, notes: null, fieldConfidence: {}, updatesSubscriptionId: null,
};

/**
 * P1 NoteForge: new entry, cycle not stated (asked as a question); the stated next charge (T+28) is stored as the anchor (future, D4/A3).
 * P2 CodePilot Pro: a receipt for a charge dated today (T). The current anchor is about a month back, so
 *    "anchor + 1 month" is still in the future and the rule would leave the date unchanged; a receipt
 *    dated today is the one case where approving visibly moves Last renewal date (next renewal becomes T + 1 month).
 * P3 Gymbox: name and amount only; currency, cycle and dates stay null.
 */
export function buildSeedProposals(set: SeedSet, today: PlainDate): SeedProposal[] {
  const p1Date = addDays(today, 28);
  // P2 is the receipt for CodePilot's most recent charge, so approving it keeps the schedule
  // (it confirms the amount and links the receipt) instead of inventing a charge today.
  const codePilotLastCharge = buildSeed("full", today).find((r) => r.key === 1)!.lastRenewalDate!;
  const p1: SeedProposal = {
    key: "P1",
    capture: NOTEFORGE_BILLING,
    captureDate: p1Date,
    updatesSeedKey: null,
    draft: {
      ...blank,
      name: "NoteForge",
      amountCents: 1200,
      currency: "USD",
      billingCycle: null, // the billing page does not state the cycle: one question for the tester
      lastRenewalDate: p1Date,
      cancelUrl: "https://noteforge.example/billing",
      fieldConfidence: { amountCents: "high", category: "low" },
    },
  };
  if (set === "starter") return [p1];
  return [
    p1,
    {
      key: "P2",
      capture: CODEPILOT_RECEIPT,
      captureDate: codePilotLastCharge,
      updatesSeedKey: 1,
      draft: {
        ...blank,
        name: "CodePilot Pro",
        vendor: "CodePilot",
        amountCents: 2000,
        currency: "USD",
        billingCycle: "monthly",
        lastRenewalDate: codePilotLastCharge,
        fieldConfidence: {
          name: "high", amountCents: "high", currency: "high", billingCycle: "high", lastRenewalDate: "high",
        },
      },
    },
    {
      key: "P3",
      capture: GYMBOX_INVOICE,
      captureDate: today,
      updatesSeedKey: null,
      draft: {
        ...blank,
        name: "Gymbox",
        amountCents: 3900,
        fieldConfidence: { name: "low", amountCents: "low" },
      },
    },
  ];
}
