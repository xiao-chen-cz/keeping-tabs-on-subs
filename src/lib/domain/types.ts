// Domain types for a subscription. Rules: specs/subscription-rules.md, logic: specs/logic-spec.md.
// Inputs are what a person (or an approved capture) supplies. Computed fields are never stored.

/** Calendar date as an ISO string `YYYY-MM-DD`. No time, no time zone. */
export type PlainDate = string;

export const SUBSCRIPTION_STATUSES = ["confirmed", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const BILLING_CYCLES = ["monthly", "quarterly", "every_4_weeks", "every_6_months", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** How each cycle steps from the anchor date (logic-spec §2.1). A new cycle is one entry here. */
export const CYCLE_STEP: Record<BillingCycle, { months: number } | { days: number }> = {
  monthly: { months: 1 },
  quarterly: { months: 3 },
  every_4_weeks: { days: 28 },
  every_6_months: { months: 6 },
  yearly: { months: 12 },
};

/** Monthly equivalent of one charge, for totals (logic-spec §3.3). Every 4 weeks = 13 charges a year. */
export const MONTHLY_FACTOR: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 1 / 3,
  every_4_weeks: 13 / 12,
  every_6_months: 1 / 6,
  yearly: 1 / 12,
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  every_4_weeks: "Every 4 weeks",
  every_6_months: "Every 6 months",
  yearly: "Yearly",
};

export const SCOPES = ["business", "personal", "family"] as const;
export type Scope = (typeof SCOPES)[number];

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const ENTRY_SOURCES = ["manual", "seed", "capture"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

/** Capture status (a proposal's lifecycle), not to be confused with the subscription status. */
export const CAPTURE_STATUSES = ["pending", "approved", "rejected"] as const;
export type CaptureStatus = (typeof CAPTURE_STATUSES)[number];

export const CAPTURE_INPUTS = ["text", "upload", "paste", "seed"] as const;
export type CaptureInput = (typeof CAPTURE_INPUTS)[number];

/** How the user cancelled with the vendor (D12). */
export const CANCEL_CHANNELS = ["website_app", "email", "phone", "letter", "in_person", "other"] as const;
export type CancelChannel = (typeof CANCEL_CHANNELS)[number];

export const SUBSCRIPTION_EVENT_KINDS = ["cancelled", "reopened", "kept", "keep_undone"] as const;
export type SubscriptionEventKind = (typeof SUBSCRIPTION_EVENT_KINDS)[number];

/** Per subscription (D13): Remind, or Keep quietly. */
export const ALERT_MODES = ["remind", "quiet"] as const;
export type AlertMode = (typeof ALERT_MODES)[number];

/** Per user (D14): in-app alerts only, or in-app plus email. */
export const ALERT_CHANNELS = ["app", "app_email"] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

/**
 * The inputs the date and price rules read. Every field the user may not know is nullable;
 * null means "not known", never "zero" or "default". Money is in integer cents.
 */
export interface SubscriptionCore {
  name: string;
  status: SubscriptionStatus;
  /** Price charged at the most recent renewal (or the upcoming first charge, D4). */
  amountCents: number | null;
  currency: Currency | null;
  /** Null when unknown. Values outside BILLING_CYCLES are mapped to null at the boundary (E16). */
  billingCycle: BillingCycle | null;
  /** Anchor of the schedule: the most recent charge, or a future first charge of a new plan (D4). */
  lastRenewalDate: PlainDate | null;
  /** Set only for trials. An active trial is trialEnds >= today (D3). */
  trialEnds: PlainDate | null;
  /** Per-row override; null means the default by cycle (D5). */
  cancelNoticeDays: number | null;
  /** Future price: applies from the first renewal on or after promoEnds. Both or neither (§4 rule 9). */
  regularPriceCents: number | null;
  promoEnds: PlainDate | null;
  /** Only for cancelled rows: vendor access continues until this date (D6). */
  accessUntil: PlainDate | null;
}

/** A stored subscription: core inputs plus descriptive fields that no rule depends on. */
export interface Subscription extends SubscriptionCore {
  id: string;
  vendor: string | null;
  plan: string | null;
  /** Optional login email or username used with the vendor. Never a password. */
  accountLabel: string | null;
  category: string | null;
  paymentMethod: string | null;
  scope: Scope | null;
  confidence: Confidence | null;
  cancelUrl: string | null;
  notes: string | null;
  source: EntrySource;
  /** Cancel-by date the user tapped Keep for (D10). */
  keptForCancelBy: PlainDate | null;
  /** D13. */
  alertMode: AlertMode;
  /** When the "stop reminding you?" offer was shown; it is shown at most once (E44). */
  quietOfferShownAt: string | null;
}

/** Everything derived from SubscriptionCore and today. Never stored, never typed by a person. */
export interface ComputedFields {
  nextRenewal: PlainDate | null;
  daysUntilRenewal: number | null;
  /** Only when the next renewal is today: the renewal after it (for "charged today · next …"). */
  followingRenewal: PlainDate | null;
  /** Effective notice: the override, or the default by cycle. */
  noticeDays: number;
  noticeIsDefault: boolean;
  cancelBy: PlainDate | null;
  /** Negative when the deadline has passed but the renewal is still ahead. */
  daysUntilCancelBy: number | null;
  /** Amount, or the regular price when the promo ends on or before the next renewal. */
  renewalAmountCents: number | null;
  /** Null when there is no amount to compare. */
  priceRises: boolean | null;
  /** The billing date is a future charge (a new plan's first charge, D4, or a stated next charge). Label only. */
  anchorInFuture: boolean;
  tags: {
    trial: boolean;
    needsUpdate: boolean;
    ending: boolean;
  };
  /** Cancelled and no longer (or never) in the Ending group. Shown only in the archive filter. */
  archived: boolean;
}

export interface ComputedSubscription<T extends SubscriptionCore = Subscription> {
  input: T;
  computed: ComputedFields;
}

/**
 * A proposed entry from a capture, waiting in the review queue (D16–20). Every field may be
 * missing, including the name; extraction returns null rather than guessing. Approval requires
 * the fields in REQUIRED_FOR_APPROVAL (logic-spec §4 rule 10).
 */
export type SubscriptionDraft = {
  [K in keyof Omit<Subscription, "id" | "source" | "keptForCancelBy" | "status" | "alertMode" | "quietOfferShownAt">]:
    | Subscription[K]
    | null;
} & {
  /** Per-field confidence from extraction; a field with no entry was not extracted. */
  fieldConfidence: Partial<Record<keyof SubscriptionCore | "category" | "scope", Confidence>>;
  /** Set when vendor + amount match an existing subscription: the draft proposes an update. */
  updatesSubscriptionId: string | null;
};

/** Name, amount, currency, cycle and one date (last renewal or trial end). */
export const REQUIRED_FOR_APPROVAL = [
  "name",
  "amountCents",
  "currency",
  "billingCycle",
  "lastRenewalDate|trialEnds",
] as const;
