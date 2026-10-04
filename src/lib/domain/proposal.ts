// Pure proposal logic: what is still missing before approval, and whether a proposal updates an
// existing subscription instead of creating a duplicate (logic-spec §4 rule 10, D16-20 plan step 1).
import {
  REQUIRED_FOR_APPROVAL,
  type Subscription,
  type SubscriptionDraft,
} from "@/lib/domain/types";

export type RequiredField = (typeof REQUIRED_FOR_APPROVAL)[number];

const hasText = (v: string | null | undefined): v is string => v != null && v.trim() !== "";

/** Required fields the draft still lacks. The date requirement is met by a last renewal date or a trial end. */
export function missingRequired(
  draft: Pick<
    SubscriptionDraft,
    "name" | "amountCents" | "currency" | "billingCycle" | "lastRenewalDate" | "trialEnds"
  >,
): RequiredField[] {
  const present: Record<RequiredField, boolean> = {
    name: hasText(draft.name),
    amountCents: draft.amountCents !== null,
    currency: draft.currency !== null,
    billingCycle: draft.billingCycle !== null,
    "lastRenewalDate|trialEnds": draft.lastRenewalDate !== null || draft.trialEnds !== null,
  };
  return REQUIRED_FOR_APPROVAL.filter((k) => !present[k]);
}

const norm = (v: string | null | undefined): string | null =>
  hasText(v) ? v.trim().toLowerCase().replace(/\s+/g, " ") : null;

type Candidate = Pick<Subscription, "id" | "name" | "vendor" | "currency" | "status">;

/**
 * Id of the first non-cancelled subscription (sorted by name) whose vendor or name equals the draft's
 * vendor or name (either side may match on either field) (case-insensitive, trimmed, spaces collapsed) in the same currency; null when none.
 * The amount does not matter: a different amount is a price change. A null draft currency matches any.
 */
export function matchExisting(
  draft: Pick<SubscriptionDraft, "name" | "vendor" | "currency">,
  subscriptions: readonly Candidate[],
): string | null {
  const wanted = new Set([norm(draft.vendor), norm(draft.name)].filter((k): k is string => k !== null));
  if (wanted.size === 0) return null;
  const sorted = [...subscriptions].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  for (const s of sorted) {
    if (s.status === "cancelled") continue;
    if (draft.currency !== null && s.currency !== draft.currency) continue;
    for (const k of [norm(s.vendor), norm(s.name)]) if (k !== null && wanted.has(k)) return s.id;
  }
  return null;
}
