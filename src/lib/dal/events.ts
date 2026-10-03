import "server-only";
import { requireUser } from "@/lib/dal/auth";
import { rowToEvent, type SubscriptionEvent } from "@/lib/dal/map-proposal";
import type { Cancellation } from "@/lib/domain/cancellation";
import type { PlainDate, SubscriptionStatus } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

/** Newest first: by the date it happened, then by when it was recorded. */
export async function listEvents(subscriptionId: string): Promise<SubscriptionEvent[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_events")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("occurred_on", { ascending: false })
    .order("recorded_at", { ascending: false });
  if (error) {
    if (error.code === "22P02") return [];
    throw new Error(`Could not load history: ${error.message}`);
  }
  return data.map(rowToEvent);
}

export interface StatusChange {
  subscriptionId: string;
  status: SubscriptionStatus;
  /** Cancelled: validated cancellation (validateCancellation). Reopened: optional note and date. */
  record?: Partial<Cancellation>;
  captureId?: string | null;
  /** Cancelled only (D6). Cleared when reopening. */
  accessUntil?: PlainDate | null;
}

/** Status change and its event in one transaction (set_subscription_status). Throws when unchanged. */
export async function setStatus(change: StatusChange): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_subscription_status", {
    p_subscription_id: change.subscriptionId,
    p_status: change.status,
    p_occurred_on: change.record?.occurredOn ?? undefined,
    p_channel: change.record?.channel ?? undefined,
    p_reference: change.record?.reference ?? undefined,
    p_note: change.record?.note ?? undefined,
    p_capture_id: change.captureId ?? undefined,
    p_access_until: change.accessUntil ?? undefined,
  });
  if (error) throw new Error(`Could not change status: ${error.message}`);
}
