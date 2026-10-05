// Pure seed builder: offset specs + an injected today -> subscriptions with real dates.
import { addDays, addMonthsClamped, compare, isPlainDate } from "@/lib/dates/plain-date";
import { nextRenewal } from "@/lib/domain/schedule";
import { CYCLE_STEP, type PlainDate, type Subscription } from "@/lib/domain/types";
import { FULL_KEYS, SEED_CATEGORIES, SEED_PAYMENT_METHODS, SEED_SPECS, STARTER_KEYS, type SeedSpec } from "./sets";

export { SEED_CATEGORIES, SEED_PAYMENT_METHODS };

export type SeedSet = "starter" | "full";

/** A seed subscription: id is `seed-<key>`; category and paymentMethod are names. */
export type SeedRow = Subscription & { key: number };

/** Latest 31st on or before `today`. */
function latest31st(today: PlainDate): PlainDate {
  const [y, m] = today.split("-").map(Number) as [number, number];
  for (let back = 0; back < 12; back++) {
    const total = y * 12 + (m - 1) - back;
    const ny = Math.floor(total / 12);
    const nm = total - ny * 12 + 1;
    const day31 = `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-31`;
    if (isPlainDate(day31) && compare(day31, today) <= 0) return day31;
  }
  throw new Error("No 31st found within 12 months");
}

/**
 * Last renewal date that makes nextRenewal(anchor, today) equal `next`. Plain "next minus one cycle"
 * breaks for month cycles near month ends (31 Oct - 1 month = 30 Sep -> next 30 Oct), so try
 * n = 1, 2, ... cycles back until the round trip holds.
 */
function deriveAnchor(spec: SeedSpec, next: PlainDate, today: PlainDate): PlainDate {
  const step = spec.cycle === null ? null : CYCLE_STEP[spec.cycle];
  if (step === null) throw new Error(`Seed #${spec.key} has a next offset but no cycle`);
  if ("days" in step) return addDays(next, -step.days);
  const probe = (anchor: PlainDate) =>
    nextRenewal(
      { name: spec.name, status: "confirmed", amountCents: spec.amountCents, currency: spec.currency,
        billingCycle: spec.cycle, lastRenewalDate: anchor, trialEnds: null, cancelNoticeDays: null,
        regularPriceCents: null, promoEnds: null, accessUntil: null },
      today,
    );
  for (let n = 1; n <= 12; n++) {
    const anchor = addMonthsClamped(next, -n * step.months);
    if (probe(anchor) === next) return anchor;
  }
  // Unreachable with a past anchor: e.g. Next = 30 Mar with today = 28 Feb, because any anchor on the
  // 30th clamps to a renewal on 28 Feb (>= today) first. Fall back to the D4 form (the anchor is the
  // upcoming charge itself, flagged "plan starts later"). Offsets and cancel-by stay exact.
  if (probe(next) === next) return next;
  throw new Error(`Seed #${spec.key}: no anchor reproduces next renewal ${next} for today ${today}`);
}

function buildRow(spec: SeedSpec, today: PlainDate): SeedRow {
  let lastRenewalDate: PlainDate | null = null;
  let trialEnds: PlainDate | null = null;
  let next: PlainDate | null = null;
  const d = spec.dates;
  if (d.kind === "next") {
    next = addDays(today, d.offset);
    lastRenewalDate = deriveAnchor(spec, next, today);
  } else if (d.kind === "lastRenewal") {
    lastRenewalDate = addDays(today, d.offset);
    next = lastRenewalDate;
  } else if (d.kind === "trialEnds") {
    trialEnds = addDays(today, d.offset);
  } else if (d.kind === "latest31st") {
    lastRenewalDate = latest31st(today);
  }
  const promoEnds = spec.promoEnds === "next" ? next : spec.promoEnds === null ? null : addDays(today, spec.promoEnds);
  if (spec.promoEnds === "next" && next === null) throw new Error(`Seed #${spec.key}: promo needs a next date`);
  return {
    key: spec.key,
    id: `seed-${spec.key}`,
    name: spec.name,
    status: spec.status,
    amountCents: spec.amountCents,
    currency: spec.currency,
    billingCycle: spec.cycle,
    lastRenewalDate,
    trialEnds,
    cancelNoticeDays: spec.cancelNoticeDays,
    regularPriceCents: spec.regularPriceCents,
    promoEnds,
    accessUntil: spec.accessUntilOffset === null ? null : addDays(today, spec.accessUntilOffset),
    vendor: null,
    plan: null,
    accountLabel: spec.accountLabel ?? null,
    category: spec.category,
    paymentMethod: spec.paymentMethod,
    scope: spec.scope,
    confidence: spec.confidence,
    cancelUrl: null,
    notes: spec.notes,
    source: "seed",
    keptForCancelBy: null,
    alertMode: spec.alertMode ?? "remind",
    quietOfferShownAt: null,
  };
}

export function buildSeed(set: SeedSet, today: PlainDate): SeedRow[] {
  const keys = set === "starter" ? STARTER_KEYS : FULL_KEYS;
  return SEED_SPECS.filter((s) => keys.includes(s.key)).map((s) => buildRow(s, today));
}
