// Sample captures for the demo, all fictional. Seeded captures have input "seed" and raw text only;
// a live demo pastes or uploads them again. Dates are built from the injected today.
import type { PlainDate } from "@/lib/domain/types";

export interface SeedCapture {
  key: string;
  mimeType: string;
  /** What the capture says. For the screenshot and the PDF this is the text a reader would see. */
  rawText: (today: PlainDate) => string;
}

export const NOTEFORGE_BILLING: SeedCapture = {
  key: "noteforge-billing",
  mimeType: "text/plain",
  rawText: (nextCharge) =>
    [
      "[Screenshot of a billing page]",
      "NoteForge - Billing",
      "Plan: Pro",
      "Price: $12.00",
      `Next charge: ${nextCharge}`,
      "Manage or cancel: https://noteforge.example/billing",
    ].join("\n"),
};

export const CODEPILOT_RECEIPT: SeedCapture = {
  key: "codepilot-receipt",
  mimeType: "text/plain",
  rawText: (chargeDate) =>
    [
      "From: billing@codepilot.example",
      "Subject: Your CodePilot Pro receipt",
      "",
      "Thanks for your payment.",
      `Date: ${chargeDate}`,
      "Plan: CodePilot Pro, monthly",
      "Amount: $20.00 USD",
      "Paid with: Business account",
    ].join("\n"),
};

export const GYMBOX_INVOICE: SeedCapture = {
  key: "gymbox-invoice",
  mimeType: "text/plain",
  rawText: () =>
    ["[PDF invoice]", "Gymbox", "Membership fee", "Total due: 39.00", "Thank you."].join("\n"),
};

/** Not seeded as a proposal: for a live demo of a fresh extraction that creates a Trial entry. */
export const READLOOP_TRIAL_EMAIL: SeedCapture = {
  key: "readloop-trial-email",
  mimeType: "text/plain",
  rawText: (trialEnds) =>
    [
      "From: hello@readloop.example",
      "Subject: Your ReadLoop trial ends in 3 days",
      "",
      `Your free trial ends on ${trialEnds}. After that ReadLoop Plus costs 6.99 EUR per month.`,
      "Cancel anytime in Settings > Subscription.",
    ].join("\n"),
};
