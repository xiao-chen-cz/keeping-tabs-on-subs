import "server-only";
import { requireUser } from "@/lib/dal/auth";
import {
  rowToCapture,
  rowToProposal,
  type Capture,
  type Proposal,
} from "@/lib/dal/map-proposal";
import { loadLookups } from "@/lib/dal/subscriptions";
import { rowToSubscription } from "@/lib/dal/map-row";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/lib/domain/types";
import type { SubscriptionFormData } from "@/lib/validation/subscription-form";

export interface PendingProposal {
  proposal: Proposal;
  /** Name of the subscription an update proposal would change. */
  updatesName: string | null;
}

/** Pending proposals, newest first. */
export async function listPendingProposals(): Promise<PendingProposal[]> {
  await requireUser();
  const supabase = await createClient();
  const [rows, lookups, subs] = await Promise.all([
    supabase.from("proposals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    loadLookups(supabase),
    supabase.from("subscriptions").select("id, name"),
  ]);
  if (rows.error) throw new Error(`Could not load the review queue: ${rows.error.message}`);
  if (subs.error) throw new Error(`Could not load subscriptions: ${subs.error.message}`);
  const names = new Map(subs.data.map((s) => [s.id, s.name]));
  return rows.data.map((r) => ({
    proposal: rowToProposal(r, lookups),
    updatesName: r.updates_subscription_id ? (names.get(r.updates_subscription_id) ?? null) : null,
  }));
}

export async function countPendingProposals(): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(`Could not count proposals: ${error.message}`);
  return count ?? 0;
}

export interface ProposalForReview {
  proposal: Proposal;
  capture: Capture | null;
  /** The subscription an update proposal would change, with lookup ids for the form. */
  existing: { subscription: Subscription; categoryId: string | null; paymentMethodId: string | null } | null;
}

export async function getProposalForReview(id: string): Promise<ProposalForReview | null> {
  await requireUser();
  const supabase = await createClient();
  const [row, lookups] = await Promise.all([
    supabase.from("proposals").select("*").eq("id", id).maybeSingle(),
    loadLookups(supabase),
  ]);
  if (row.error) {
    if (row.error.code === "22P02") return null;
    throw new Error(`Could not load proposal: ${row.error.message}`);
  }
  if (!row.data) return null;
  const [cap, sub] = await Promise.all([
    supabase.from("captures").select("*").eq("id", row.data.capture_id).maybeSingle(),
    row.data.updates_subscription_id
      ? supabase.from("subscriptions").select("*").eq("id", row.data.updates_subscription_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (cap.error) throw new Error(`Could not load capture: ${cap.error.message}`);
  if (sub.error) throw new Error(`Could not load subscription: ${sub.error.message}`);
  return {
    proposal: rowToProposal(row.data, lookups),
    capture: cap.data ? rowToCapture(cap.data) : null,
    existing: sub.data
      ? {
          subscription: rowToSubscription(sub.data, lookups),
          categoryId: sub.data.category_id,
          paymentMethodId: sub.data.payment_method_id,
        }
      : null,
  };
}

/** The original capture linked to a subscription (subscriptions.capture_id), or null. */
export async function getCaptureForSubscription(subscriptionId: string): Promise<Capture | null> {
  await requireUser();
  const supabase = await createClient();
  const sub = await supabase.from("subscriptions").select("capture_id").eq("id", subscriptionId).maybeSingle();
  if (sub.error) {
    if (sub.error.code === "22P02") return null;
    throw new Error(`Could not load subscription: ${sub.error.message}`);
  }
  if (!sub.data?.capture_id) return null;
  const cap = await supabase.from("captures").select("*").eq("id", sub.data.capture_id).maybeSingle();
  if (cap.error) throw new Error(`Could not load capture: ${cap.error.message}`);
  return cap.data ? rowToCapture(cap.data) : null;
}

/** Validated form data -> snake_case keys of approve_proposal's p_fields (amounts as strings). */
export function approvalFields(d: SubscriptionFormData): Json {
  return { ...d };
}

/** Approve in one transaction (insert or update the subscription, mark the proposal approved). Returns the subscription id. */
export async function approveProposal(id: string, data: SubscriptionFormData): Promise<string> {
  await requireUser();
  const supabase = await createClient();
  const { data: subId, error } = await supabase.rpc("approve_proposal", {
    p_proposal_id: id,
    p_fields: approvalFields(data),
  });
  if (error) throw new Error(`Could not approve: ${error.message}`);
  return subId;
}

export async function rejectProposal(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_proposal", { p_proposal_id: id });
  if (error) throw new Error(`Could not reject: ${error.message}`);
}
