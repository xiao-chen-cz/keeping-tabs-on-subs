// Pure helpers and types shared by the subscription form (client) and its pages/actions (server).
import type { Subscription } from "@/lib/domain/types";

// "status" is display-only (read-only text on edit); it is never submitted or accepted (D12).
export const FORM_FIELDS = [
  "name",
  "status",
  "amount",
  "currency",
  "billing_cycle",
  "last_renewal_date",
  "trial_ends",
  "cancel_notice_days",
  "regular_price",
  "promo_ends",
  "category_id",
  "payment_method_id",
  "scope",
  "confidence",
  "vendor",
  "plan",
  "account_label",
  "cancel_url",
  "notes",
] as const;

export type FormField = (typeof FORM_FIELDS)[number];
export type FormValues = Record<FormField, string>;

export interface SubscriptionFormState {
  fieldErrors: Record<string, string[]>;
  /** Raw submitted values, echoed back so a failed submit keeps what the user typed. */
  values: Record<string, string> | null;
}

export const INITIAL_FORM_STATE: SubscriptionFormState = { fieldErrors: {}, values: null };

export function emptyFormValues(): FormValues {
  return Object.fromEntries(FORM_FIELDS.map((f) => [f, ""])) as FormValues;
}

const cents = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));

export function formValuesFromSubscription(
  s: Subscription,
  ids: { categoryId: string | null; paymentMethodId: string | null },
): FormValues {
  return {
    name: s.name,
    status: s.status,
    amount: cents(s.amountCents),
    currency: s.currency ?? "",
    billing_cycle: s.billingCycle ?? "",
    last_renewal_date: s.lastRenewalDate ?? "",
    trial_ends: s.trialEnds ?? "",
    cancel_notice_days: s.cancelNoticeDays === null ? "" : String(s.cancelNoticeDays),
    regular_price: cents(s.regularPriceCents),
    promo_ends: s.promoEnds ?? "",
    category_id: ids.categoryId ?? "",
    payment_method_id: ids.paymentMethodId ?? "",
    scope: s.scope ?? "",
    confidence: s.confidence ?? "",
    vendor: s.vendor ?? "",
    plan: s.plan ?? "",
    account_label: s.accountLabel ?? "",
    cancel_url: s.cancelUrl ?? "",
    notes: s.notes ?? "",
  };
}
