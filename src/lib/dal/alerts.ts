import "server-only";
import { requireUser } from "@/lib/dal/auth";
import type { AlertMode, PlainDate } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

/** Keep (D10): sets kept_for_cancel_by and logs a `kept` event in one transaction (keep_renewal). */
export async function keepRenewal(subscriptionId: string, cancelBy: PlainDate): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("keep_renewal", { p_subscription_id: subscriptionId, p_cancel_by: cancelBy });
  if (error) throw new Error(`Could not keep: ${error.message}`);
}

/** How many renewals of this row the user has kept (for the quiet offer, E44). */
export async function countKept(subscriptionId: string): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("subscription_events")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", subscriptionId)
    .eq("kind", "kept");
  if (error) throw new Error(`Could not count keeps: ${error.message}`);
  return count ?? 0;
}

/** Answer to the quiet offer, or a change on the detail page. Records that the offer was shown when asked. */
export async function setAlertMode(
  subscriptionId: string,
  mode: AlertMode,
  { offerAnswered = false }: { offerAnswered?: boolean } = {},
): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update(offerAnswered ? { alert_mode: mode, quiet_offer_shown_at: new Date().toISOString() } : { alert_mode: mode })
    .eq("id", subscriptionId);
  if (error) throw new Error(`Could not change reminders: ${error.message}`);
}
