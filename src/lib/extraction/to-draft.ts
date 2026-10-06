// Model output -> SubscriptionDraft. Code, not the model, enforces the rules of logic-spec §4 here
// (plan d16-20 B9, B10): only valid enums, dates and amounts survive, payment details are dropped,
// and a capture that matches an existing subscription becomes an update proposal.
import { isPlainDate } from "@/lib/dates/plain-date";
import { matchExisting } from "@/lib/domain/proposal";
import { parseAmountCents } from "@/lib/domain/questions";
import {
  CONFIDENCES,
  type Confidence,
  type Subscription,
  type SubscriptionDraft,
} from "@/lib/domain/types";
import type { Extraction } from "./schema";

export type MatchCandidate = Pick<
  Subscription,
  | "id" | "name" | "vendor" | "currency" | "status" | "accountLabel"
  | "category" | "scope" | "confidence" | "paymentMethod"
>;

export interface DraftContext {
  /** The user's category names (the fixed list). */
  categories: readonly string[];
  /** The user's payment method nicknames. */
  paymentMethods: readonly string[];
  subscriptions: readonly MatchCandidate[];
}

// Card numbers (13-19 digits, spaces or dashes allowed) and IBANs. Never stored (§4 rule 7).
const CARD = /\b\d(?:[ -]?\d){12,18}\b/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g;
const REMOVED = "[number removed]";

export function redactPaymentNumbers(s: string): string {
  return s.replace(CARD, REMOVED).replace(IBAN, REMOVED);
}

function clean(v: string | null): string | null {
  if (v === null) return null;
  const s = redactPaymentNumbers(v.trim());
  return s === "" ? null : s;
}

const date = (v: string | null) => (v !== null && isPlainDate(v.trim()) ? v.trim() : null);
const cents = (v: string | null) => (v === null ? null : parseAmountCents(v));
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// A link printed without a scheme ("noteforge.example/billing") is read as https.
const BARE_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;

function httpUrl(v: string | null): string | null {
  if (v === null) return null;
  const s = v.trim();
  try {
    const u = new URL(BARE_DOMAIN.test(s) ? `https://${s}` : s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** The lower of two confidences; a missing one counts as Low (a guess). Null when neither is set. */
export function lowerConfidence(a: Confidence | null, b: Confidence | null): Confidence | null {
  if (a === null && b === null) return null;
  const rank = (c: Confidence | null) => CONFIDENCES.indexOf(c ?? "low");
  return CONFIDENCES[Math.max(rank(a), rank(b))];
}

export function extractionToDraft(x: Extraction, ctx: DraftContext): SubscriptionDraft {
  const amountCents = cents(x.amount);
  // A stated last charge is the anchor; otherwise a stated next charge is stored as a future anchor (A3).
  // During a trial the trial end is the next charge (D3), so a next charge date adds nothing.
  const trialEnds = date(x.trial_ends);
  const lastCharge = date(x.last_charge_date);
  const lastRenewalDate = lastCharge ?? (trialEnds === null ? date(x.next_charge_date) : null);

  // Regular price and Promo ends only when both are stated (§4 rule 9).
  let regularPriceCents = cents(x.regular_price);
  let promoEnds = date(x.promo_ends);
  if (regularPriceCents === null || promoEnds === null) [regularPriceCents, promoEnds] = [null, null];

  const notice = x.cancel_notice_days;
  const category = x.category === null ? null : (ctx.categories.find((c) => sameText(c, x.category!)) ?? null);
  const paymentMethod =
    x.payment_method_label === null
      ? null
      : (ctx.paymentMethods.find((p) => sameText(p, x.payment_method_label!)) ?? null);

  const fc = x.field_confidence;
  const fieldConfidence: SubscriptionDraft["fieldConfidence"] = {};
  const draft: SubscriptionDraft = {
    name: clean(x.name),
    vendor: clean(x.vendor),
    plan: clean(x.plan),
    accountLabel: clean(x.account_label),
    amountCents,
    currency: x.currency,
    billingCycle: x.billing_cycle,
    lastRenewalDate,
    trialEnds,
    cancelNoticeDays: notice !== null && notice >= 0 && notice <= 365 ? notice : null,
    regularPriceCents,
    promoEnds,
    accessUntil: null,
    cancelUrl: httpUrl(x.cancel_url),
    category,
    paymentMethod,
    scope: x.scope,
    confidence: x.scope === null && category === null ? null : lowerConfidence(category ? x.category_confidence : null, x.scope ? x.scope_confidence : null),
    notes: clean(x.is_subscription ? x.notes : ["This does not look like a subscription.", x.notes].filter(Boolean).join(" ")),
    fieldConfidence,
    updatesSubscriptionId: null,
  };

  const set = (key: keyof SubscriptionDraft["fieldConfidence"], present: boolean, c: Confidence | null) => {
    if (present && c !== null) fieldConfidence[key] = c;
  };
  set("name", draft.name !== null, fc.name);
  set("amountCents", amountCents !== null, fc.amount);
  set("currency", draft.currency !== null, fc.currency);
  set("billingCycle", draft.billingCycle !== null, fc.billing_cycle);
  set("lastRenewalDate", lastRenewalDate !== null, fc.date);
  set("trialEnds", trialEnds !== null, fc.date);
  set("category", category !== null, x.category_confidence);
  set("scope", draft.scope !== null, x.scope_confidence);

  // A known payment method is Scope evidence (§4 rules 4, 8): when every subscription paid with it
  // has the same scope, that scope wins over the model's suggestion.
  if (paymentMethod !== null) {
    const scopes = new Set(
      ctx.subscriptions.filter((s) => s.paymentMethod === paymentMethod && s.scope !== null).map((s) => s.scope),
    );
    if (scopes.size === 1) {
      const [scope] = scopes;
      const scopeConfidence: Confidence = "medium"; // indirect evidence (§4 rule 6)
      draft.scope = scope;
      fieldConfidence.scope = scopeConfidence;
      draft.confidence = lowerConfidence(category ? x.category_confidence : null, scopeConfidence);
    }
  }

  // Update, not duplicate (§4 rule 10 / CLAUDE.md). The model often splits "CodePilot Pro" into name
  // "CodePilot" and plan "Pro", so name + plan is tried too. Category, Scope and Confidence are only
  // filled when the subscription has none (§4 rule 1).
  const withPlan = draft.name !== null && draft.plan !== null ? `${draft.name} ${draft.plan}` : null;
  const matchId =
    matchExisting(draft, ctx.subscriptions) ??
    (withPlan === null ? null : matchExisting({ ...draft, name: withPlan }, ctx.subscriptions));
  if (matchId !== null) {
    const existing = ctx.subscriptions.find((s) => s.id === matchId)!;
    draft.updatesSubscriptionId = matchId;
    draft.name = existing.name; // an update never renames
    if (existing.category !== null) draft.category = null;
    if (existing.scope !== null) draft.scope = null;
    if (existing.confidence !== null) draft.confidence = null;
    if (draft.category === null) delete fieldConfidence.category;
    if (draft.scope === null) delete fieldConfidence.scope;
  }
  return draft;
}

/** The proposal for a capture the model could not read: everything empty, the user fills it in (plan B11). */
export function emptyDraft(): SubscriptionDraft {
  return {
    name: null, vendor: null, plan: null, accountLabel: null, amountCents: null, currency: null, billingCycle: null,
    lastRenewalDate: null, trialEnds: null, cancelNoticeDays: null, regularPriceCents: null, promoEnds: null,
    accessUntil: null, cancelUrl: null, category: null, paymentMethod: null, scope: null, confidence: null, notes: null,
    fieldConfidence: {}, updatesSubscriptionId: null,
  };
}
