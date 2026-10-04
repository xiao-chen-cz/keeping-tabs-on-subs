// Pure helpers for the review screen: prefill (including the update overlay), which questions to ask,
// and how an answer maps to a form field. No React, no server-only: unit-testable.
import { emptyFormValues, formValuesFromSubscription, type FormField, type FormValues } from "./subscription-form-values";
import type { Proposal } from "@/lib/dal/map-proposal";
import { parseAnswer } from "@/lib/domain/questions";
import { formatDay } from "./format";
import { formatMoney } from "@/lib/domain/totals";
import { BILLING_CYCLE_LABELS, REQUIRED_FOR_APPROVAL, type Confidence, type Subscription } from "@/lib/domain/types";

type RequiredField = (typeof REQUIRED_FOR_APPROVAL)[number];

export interface ExistingForReview {
  subscription: Subscription;
  categoryId: string | null;
  paymentMethodId: string | null;
}

const cents = (c: number) => (c / 100).toFixed(2);

/**
 * Form values for a proposal. For an update proposal, the matched subscription's current values overlaid
 * with the proposal's non-null values, so approving never blanks a field the capture did not mention.
 */
export function proposalFormValues(proposal: Proposal, existing: ExistingForReview | null): FormValues {
  const base = existing
    ? formValuesFromSubscription(existing.subscription, existing)
    : { ...emptyFormValues(), status: "confirmed" };
  const d = proposal.draft;
  const over: Partial<FormValues> = {};
  const set = (k: FormField, v: string | null) => {
    if (v !== null && v !== "") over[k] = v;
  };
  set("name", d.name);
  set("amount", d.amountCents === null ? null : cents(d.amountCents));
  set("currency", d.currency);
  set("billing_cycle", d.billingCycle);
  set("last_renewal_date", d.lastRenewalDate);
  set("trial_ends", d.trialEnds);
  set("cancel_notice_days", d.cancelNoticeDays === null ? null : String(d.cancelNoticeDays));
  set("regular_price", d.regularPriceCents === null ? null : cents(d.regularPriceCents));
  set("promo_ends", d.promoEnds);
  set("category_id", proposal.categoryId);
  set("payment_method_id", proposal.paymentMethodId);
  set("scope", d.scope);
  set("confidence", d.confidence);
  set("vendor", d.vendor);
  set("plan", d.plan);
  set("cancel_url", d.cancelUrl);
  set("notes", d.notes);
  return { ...base, ...over };
}

/** The form field each required-field question fills. */
export const FIELD_FOR_QUESTION: Record<RequiredField, FormField> = {
  name: "name",
  amountCents: "amount",
  currency: "currency",
  billingCycle: "billing_cycle",
  "lastRenewalDate|trialEnds": "last_renewal_date",
};

/** Is this required field filled in the current form values? Typed answers must parse. */
export function isAnswered(values: FormValues, field: RequiredField): boolean {
  switch (field) {
    case "lastRenewalDate|trialEnds":
      return parseAnswer(field, values.last_renewal_date) !== null || parseAnswer(field, values.trial_ends) !== null;
    default:
      return parseAnswer(field, values[FIELD_FOR_QUESTION[field]]) !== null;
  }
}

/** Required fields still empty in the prefilled values: the questions to ask. */
export function missingFromValues(values: FormValues): RequiredField[] {
  return REQUIRED_FOR_APPROVAL.filter((f) => !isAnswered(values, f));
}

/** Form values with one answer applied (amount answers are kept as typed). */
export function applyAnswer(values: FormValues, field: RequiredField, answer: string): FormValues {
  return { ...values, [FIELD_FOR_QUESTION[field]]: answer };
}

const CONFIDENCE_FIELD: Record<string, FormField> = {
  name: "name",
  amountCents: "amount",
  currency: "currency",
  billingCycle: "billing_cycle",
  lastRenewalDate: "last_renewal_date",
  trialEnds: "trial_ends",
  cancelNoticeDays: "cancel_notice_days",
  regularPriceCents: "regular_price",
  promoEnds: "promo_ends",
  category: "category_id",
  scope: "scope",
};

/** Form fields whose extraction confidence is not high, for the small marker next to the field. */
export function confidenceFlags(
  fieldConfidence: Proposal["draft"]["fieldConfidence"],
): Partial<Record<FormField, Exclude<Confidence, "high">>> {
  const out: Partial<Record<FormField, Exclude<Confidence, "high">>> = {};
  for (const [key, level] of Object.entries(fieldConfidence)) {
    const field = CONFIDENCE_FIELD[key];
    if (field && (level === "low" || level === "medium")) out[field] = level;
  }
  return out;
}

export interface ProposalChange {
  key: "amount" | "cycle" | "billingDate";
  label: string;
  from: string;
  to: string;
  /** Price rise = "rise" (shown in the danger colour); everything else is neutral. */
  tone: "rise" | "neutral";
}

/** Values the capture would change on the matched subscription. Only non-null draft values count. */
export function proposalChanges(proposal: Proposal, existing: Subscription): ProposalChange[] {
  const d = proposal.draft;
  const out: ProposalChange[] = [];
  if (d.amountCents !== null && d.amountCents !== existing.amountCents) {
    const cur = d.currency ?? existing.currency;
    const fmt = (c: number | null) => (c === null || cur === null ? "unknown" : formatMoney(c, cur));
    out.push({
      key: "amount",
      label: "Price",
      from: fmt(existing.amountCents),
      to: fmt(d.amountCents),
      tone: existing.amountCents !== null && d.amountCents > existing.amountCents ? "rise" : "neutral",
    });
  }
  if (d.billingCycle !== null && d.billingCycle !== existing.billingCycle) {
    out.push({
      key: "cycle",
      label: "Billing cycle",
      from: existing.billingCycle ? BILLING_CYCLE_LABELS[existing.billingCycle] : "unknown",
      to: BILLING_CYCLE_LABELS[d.billingCycle],
      tone: "neutral",
    });
  }
  if (d.lastRenewalDate !== null && d.lastRenewalDate !== existing.lastRenewalDate) {
    out.push({
      key: "billingDate",
      label: "Billing date",
      from: existing.lastRenewalDate ? formatDay(existing.lastRenewalDate) : "unknown",
      to: formatDay(d.lastRenewalDate),
      tone: "neutral",
    });
  }
  return out;
}
