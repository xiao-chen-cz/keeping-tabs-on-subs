// Maps a SeedRow to the subscriptions insert shape. Pure; lookup ids come from the caller.
import type { Database } from "@/lib/supabase/database.types";
import type { SeedRow } from "./build-seed";

export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];

const toNumeric = (cents: number | null): number | null => (cents === null ? null : Number((cents / 100).toFixed(2)));

export function seedRowToInsert(
  row: SeedRow,
  userId: string,
  categoryIds: ReadonlyMap<string, string>,
  paymentMethodIds: ReadonlyMap<string, string>,
): SubscriptionInsert {
  const lookup = (map: ReadonlyMap<string, string>, name: string | null, kind: string) => {
    if (name === null) return null;
    const id = map.get(name);
    if (!id) throw new Error(`Unknown ${kind} "${name}" for seed #${row.key}`);
    return id;
  };
  return {
    user_id: userId,
    name: row.name,
    status: row.status,
    amount: toNumeric(row.amountCents),
    currency: row.currency,
    billing_cycle: row.billingCycle,
    last_renewal_date: row.lastRenewalDate,
    trial_ends: row.trialEnds,
    cancel_notice_days: row.cancelNoticeDays,
    regular_price: toNumeric(row.regularPriceCents),
    promo_ends: row.promoEnds,
    access_until: row.accessUntil,
    category_id: lookup(categoryIds, row.category, "category"),
    payment_method_id: lookup(paymentMethodIds, row.paymentMethod, "payment method"),
    scope: row.scope,
    confidence: row.confidence,
    vendor: row.vendor,
    plan: row.plan,
    cancel_url: row.cancelUrl,
    notes: row.notes,
    source: "seed",
    kept_for_cancel_by: row.keptForCancelBy,
  };
}
