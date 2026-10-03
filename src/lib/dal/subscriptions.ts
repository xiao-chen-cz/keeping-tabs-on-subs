import "server-only";
import { requireUser } from "@/lib/dal/auth";
import { rowToSubscription, type NameLookups, type SubscriptionRow } from "@/lib/dal/map-row";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/lib/domain/types";
import type { SubscriptionFormData } from "@/lib/validation/subscription-form";

type Client = Awaited<ReturnType<typeof createClient>>;
type WritableColumns = Omit<
  Database["public"]["Tables"]["subscriptions"]["Update"],
  "id" | "user_id" | "source" | "created_at" | "updated_at" | "kept_for_cancel_by"
>;

async function loadLookups(supabase: Client): Promise<NameLookups> {
  const [cats, pms] = await Promise.all([
    supabase.from("categories").select("id, name"),
    supabase.from("payment_methods").select("id, name"),
  ]);
  if (cats.error) throw new Error(`Could not load categories: ${cats.error.message}`);
  if (pms.error) throw new Error(`Could not load payment methods: ${pms.error.message}`);
  return {
    categories: new Map(cats.data.map((c) => [c.id, c.name])),
    paymentMethods: new Map(pms.data.map((p) => [p.id, p.name])),
  };
}

/** Form data -> table columns. Never includes user_id or source (DB defaults apply). */
function formToColumns(d: SubscriptionFormData): WritableColumns {
  return {
    name: d.name,
    status: d.status,
    amount: d.amount === null ? null : Number(d.amount),
    currency: d.currency,
    billing_cycle: d.billing_cycle,
    last_renewal_date: d.last_renewal_date,
    trial_ends: d.trial_ends,
    cancel_notice_days: d.cancel_notice_days,
    regular_price: d.regular_price === null ? null : Number(d.regular_price),
    promo_ends: d.promo_ends,
    access_until: d.access_until,
    category_id: d.category_id,
    payment_method_id: d.payment_method_id,
    scope: d.scope,
    confidence: d.confidence,
    vendor: d.vendor,
    plan: d.plan,
    cancel_url: d.cancel_url,
    notes: d.notes,
  };
}

export async function listSubscriptions(): Promise<Subscription[]> {
  await requireUser();
  const supabase = await createClient();
  const [rows, lookups] = await Promise.all([
    supabase.from("subscriptions").select("*").order("name"),
    loadLookups(supabase),
  ]);
  if (rows.error) throw new Error(`Could not load subscriptions: ${rows.error.message}`);
  return rows.data.map((r: SubscriptionRow) => rowToSubscription(r, lookups));
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  await requireUser();
  const supabase = await createClient();
  const [row, lookups] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("id", id).maybeSingle(),
    loadLookups(supabase),
  ]);
  if (row.error) {
    // A malformed id (not a uuid) is "not found", not a crash.
    if (row.error.code === "22P02") return null;
    throw new Error(`Could not load subscription: ${row.error.message}`);
  }
  return row.data ? rowToSubscription(row.data, lookups) : null;
}

/** Inserts a manual entry for the signed-in user (user_id from auth.uid(), source = manual). */
export async function createSubscription(data: SubscriptionFormData): Promise<string> {
  await requireUser();
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("subscriptions")
    .insert({ ...formToColumns(data), name: data.name })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create subscription: ${error.message}`);
  return row.id;
}

/** Returns the id, or null when no row was updated (missing, or not the user's). */
export async function updateSubscription(
  id: string,
  data: SubscriptionFormData,
): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("subscriptions")
    .update(formToColumns(data))
    .eq("id", id)
    .select("id");
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error(`Could not update subscription: ${error.message}`);
  }
  return rows.length === 0 ? null : rows[0].id;
}
