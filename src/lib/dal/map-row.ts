// Pure mapping from a subscriptions table row to the domain Subscription. No server-only import:
// unit-testable. Money arrives as JSON numbers (numeric(10,2)); the domain uses integer cents.
import type { Database } from "@/lib/supabase/database.types";
import type { Subscription } from "@/lib/domain/types";

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export interface NameLookups {
  categories: ReadonlyMap<string, string>;
  paymentMethods: ReadonlyMap<string, string>;
}

export function toCents(n: number | null): number | null {
  return n === null ? null : Math.round(n * 100);
}

export function rowToSubscription(row: SubscriptionRow, lookups: NameLookups): Subscription {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    amountCents: toCents(row.amount),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    lastRenewalDate: row.last_renewal_date,
    trialEnds: row.trial_ends,
    cancelNoticeDays: row.cancel_notice_days,
    regularPriceCents: toCents(row.regular_price),
    promoEnds: row.promo_ends,
    accessUntil: row.access_until,
    vendor: row.vendor,
    plan: row.plan,
    category: row.category_id ? (lookups.categories.get(row.category_id) ?? null) : null,
    paymentMethod: row.payment_method_id
      ? (lookups.paymentMethods.get(row.payment_method_id) ?? null)
      : null,
    scope: row.scope,
    confidence: row.confidence,
    cancelUrl: row.cancel_url,
    notes: row.notes,
    source: row.source,
    keptForCancelBy: row.kept_for_cancel_by,
  };
}
