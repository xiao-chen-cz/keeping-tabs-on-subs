// Pure mappers for captures, proposals and events. No server-only import: unit-testable.
import { toCents, type NameLookups } from "@/lib/dal/map-row";
import {
  CONFIDENCES,
  type CancelChannel,
  type CaptureInput,
  type CaptureStatus,
  type Confidence,
  type PlainDate,
  type SubscriptionDraft,
  type SubscriptionEventKind,
} from "@/lib/domain/types";
import type { Database } from "@/lib/supabase/database.types";

export type CaptureRow = Database["public"]["Tables"]["captures"]["Row"];
export type ProposalRow = Database["public"]["Tables"]["proposals"]["Row"];
export type EventRow = Database["public"]["Tables"]["subscription_events"]["Row"];
export type ProposalInsert = Database["public"]["Tables"]["proposals"]["Insert"];

const toNumeric = (cents: number | null): number | null => (cents === null ? null : Number((cents / 100).toFixed(2)));

export interface Capture {
  id: string;
  input: CaptureInput;
  rawText: string | null;
  storagePath: string | null;
  mimeType: string | null;
  receivedAt: string;
  extractionError: string | null;
}

export interface Proposal {
  id: string;
  status: CaptureStatus;
  captureId: string;
  draft: SubscriptionDraft;
  /** Category and payment method ids, for preselecting the review form's selects. */
  categoryId: string | null;
  paymentMethodId: string | null;
  subscriptionId: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  kind: SubscriptionEventKind;
  occurredOn: PlainDate;
  channel: CancelChannel | null;
  reference: string | null;
  note: string | null;
  captureId: string | null;
  /** Kept events only: the Cancel-by the Keep applies to. */
  cancelBy: PlainDate | null;
  recordedAt: string;
}

/** Keeps only entries whose value is a known confidence; anything else in the json is dropped. */
export function parseFieldConfidence(json: unknown): SubscriptionDraft["fieldConfidence"] {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return {};
  const out: Record<string, Confidence> = {};
  for (const [k, v] of Object.entries(json)) {
    if (typeof v === "string" && (CONFIDENCES as readonly string[]).includes(v)) out[k] = v as Confidence;
  }
  return out;
}

export function rowToProposal(row: ProposalRow, lookups: NameLookups): Proposal {
  return {
    id: row.id,
    status: row.status,
    captureId: row.capture_id,
    categoryId: row.category_id,
    paymentMethodId: row.payment_method_id,
    subscriptionId: row.subscription_id,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    draft: {
      name: row.name,
      amountCents: toCents(row.amount),
      currency: row.currency,
      billingCycle: row.billing_cycle,
      lastRenewalDate: row.last_renewal_date,
      trialEnds: row.trial_ends,
      cancelNoticeDays: row.cancel_notice_days,
      regularPriceCents: toCents(row.regular_price),
      promoEnds: row.promo_ends,
      accessUntil: null, // a capture never proposes a cancelled row
      vendor: row.vendor,
      plan: row.plan,
      accountLabel: row.account_label,
      category: row.category_id ? (lookups.categories.get(row.category_id) ?? null) : null,
      paymentMethod: row.payment_method_id ? (lookups.paymentMethods.get(row.payment_method_id) ?? null) : null,
      scope: row.scope,
      confidence: row.confidence,
      cancelUrl: row.cancel_url,
      notes: row.notes,
      fieldConfidence: parseFieldConfidence(row.field_confidence),
      updatesSubscriptionId: row.updates_subscription_id,
    },
  };
}

export function rowToCapture(row: CaptureRow): Capture {
  return {
    id: row.id,
    input: row.input,
    rawText: row.raw_text,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    receivedAt: row.received_at,
    extractionError: row.extraction_error,
  };
}

export function rowToEvent(row: EventRow): SubscriptionEvent {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    kind: row.kind,
    occurredOn: row.occurred_on,
    channel: row.channel,
    reference: row.reference,
    note: row.note,
    captureId: row.capture_id,
    cancelBy: row.cancel_by,
    recordedAt: row.recorded_at,
  };
}

/**
 * Draft -> proposals insert (without user_id: the column default is auth.uid(); the seed sets it).
 * Category and payment method arrive as ids, resolved by the caller from the draft's names.
 */
export function draftToProposalInsert(
  d: SubscriptionDraft,
  captureId: string,
  ids: { categoryId: string | null; paymentMethodId: string | null },
): ProposalInsert {
  return {
    capture_id: captureId,
    name: d.name,
    amount: toNumeric(d.amountCents),
    currency: d.currency,
    billing_cycle: d.billingCycle,
    last_renewal_date: d.lastRenewalDate,
    trial_ends: d.trialEnds,
    cancel_notice_days: d.cancelNoticeDays,
    regular_price: toNumeric(d.regularPriceCents),
    promo_ends: d.promoEnds,
    category_id: ids.categoryId,
    payment_method_id: ids.paymentMethodId,
    scope: d.scope,
    confidence: d.confidence,
    vendor: d.vendor,
    plan: d.plan,
    account_label: d.accountLabel,
    cancel_url: d.cancelUrl,
    notes: d.notes,
    field_confidence: d.fieldConfidence,
    updates_subscription_id: d.updatesSubscriptionId,
  };
}
