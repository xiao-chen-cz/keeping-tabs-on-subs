// The 13 demo subscriptions from specs/seed-data.md as offset specs (days from today, T).
// Fictional data only. Proposals P1-P3 arrive with the capture milestone (D16-20).
import type { BillingCycle, Confidence, Currency, Scope } from "@/lib/domain/types";

/** How a row's dates are derived from today. */
export type DateSpec =
  | { kind: "next"; offset: number } // next renewal = T + offset; the anchor is derived
  | { kind: "lastRenewal"; offset: number } // explicit anchor (D4 future first charge)
  | { kind: "trialEnds"; offset: number } // trial end = T + offset, no last renewal
  | { kind: "latest31st" } // anchor = latest 31st on or before T (month-end clamping)
  | { kind: "none" };

export type SeedSpec = {
  key: number;
  name: string;
  status: "confirmed" | "cancelled";
  amountCents: number;
  currency: Currency;
  cycle: BillingCycle | null;
  dates: DateSpec;
  /** Days from T, cancelled rows only. */
  accessUntilOffset: number | null;
  cancelNoticeDays: number | null;
  regularPriceCents: number | null;
  /** "next" = the derived next renewal date; a number = days from T; null = no promo. */
  promoEnds: "next" | number | null;
  category: string;
  scope: Scope;
  confidence: Confidence;
  paymentMethod: string | null;
  notes: string | null;
  accountLabel?: string | null;
};

export const SEED_CATEGORIES = [
  "AI",
  "Software / SaaS",
  "Infrastructure / Hosting",
  "Content / Media",
  "Memberships / Communities",
  "App Store",
  "Insurance",
  "Finance / Banking",
  "Other",
] as const;

export const SEED_PAYMENT_METHODS = ["Private account", "Business account"] as const;

const PRIVATE = "Private account";
const BUSINESS = "Business account";

const base = {
  status: "confirmed",
  accessUntilOffset: null,
  cancelNoticeDays: null,
  regularPriceCents: null,
  promoEnds: null,
  confidence: "high",
  notes: null,
} as const;

export const SEED_SPECS: readonly SeedSpec[] = [
  { ...base, key: 1, name: "CodePilot Pro", amountCents: 2000, currency: "USD", cycle: "monthly",
    dates: { kind: "next", offset: 27 }, category: "AI", scope: "business", paymentMethod: BUSINESS,
    accountLabel: "me@example.com" },
  { ...base, key: 2, name: "Notely Teams", amountCents: 24000, currency: "EUR", cycle: "yearly",
    dates: { kind: "next", offset: 195 }, cancelNoticeDays: 30, category: "Software / SaaS",
    scope: "business", paymentMethod: BUSINESS },
  { ...base, key: 3, name: "The Daily Ledger", amountCents: 200, currency: "EUR", cycle: "every_4_weeks",
    dates: { kind: "next", offset: 6 }, regularPriceCents: 1200, promoEnds: 300,
    category: "Content / Media", scope: "personal", paymentMethod: PRIVATE },
  { ...base, key: 4, name: "VoiceDraft Pro", amountCents: 12000, currency: "USD", cycle: "yearly",
    dates: { kind: "next", offset: 10 }, regularPriceCents: 20000, promoEnds: "next",
    category: "Software / SaaS", scope: "business", paymentMethod: BUSINESS },
  { ...base, key: 5, name: "StreamBox Prime", amountCents: 899, currency: "EUR", cycle: "monthly",
    dates: { kind: "trialEnds", offset: 19 }, category: "Content / Media", scope: "personal",
    paymentMethod: null },
  { ...base, key: 6, name: "BudgetBuddy", amountCents: 2999, currency: "EUR", cycle: "yearly",
    dates: { kind: "lastRenewal", offset: 9 }, category: "Finance / Banking", scope: "personal",
    paymentMethod: PRIVATE, notes: "Switched from monthly 2.99 EUR to annual, saves 20%" },
  { ...base, key: 7, name: "FitClub Online", status: "cancelled", amountCents: 1490, currency: "EUR",
    cycle: "monthly", dates: { kind: "none" }, accessUntilOffset: 12,
    category: "Memberships / Communities", scope: "personal", paymentMethod: null },
  { ...base, key: 8, name: "PixelStock", amountCents: 999, currency: "USD", cycle: null,
    dates: { kind: "trialEnds", offset: -5 }, category: "Software / SaaS", scope: "business",
    confidence: "low", paymentMethod: null },
  { ...base, key: 9, name: "Cloudly Storage", amountCents: 999, currency: "EUR", cycle: "monthly",
    dates: { kind: "latest31st" }, category: "Infrastructure / Hosting", scope: "business",
    paymentMethod: BUSINESS },
  { ...base, key: 10, name: "SafeHome Insurance", amountCents: 6200, currency: "EUR", cycle: "quarterly",
    dates: { kind: "next", offset: 50 }, category: "Insurance", scope: "personal", paymentMethod: PRIVATE },
  { ...base, key: 11, name: "EuroServer Hosting", amountCents: 1147, currency: "EUR", cycle: "monthly",
    dates: { kind: "next", offset: 20 }, category: "Infrastructure / Hosting", scope: "business",
    paymentMethod: BUSINESS, notes: "Billed in arrears, amount varies. Was 10.34 until last quarter" },
  { ...base, key: 12, name: "ChatPal Plus", amountCents: 2300, currency: "EUR", cycle: "monthly",
    dates: { kind: "next", offset: 1 }, category: "AI", scope: "business", confidence: "low",
    paymentMethod: null, notes: "Looks re-activated, confirm" },
  // Same vendor as #1, a second login: shows the Account label in the list and keeps P2 matching #1.
  { ...base, key: 13, name: "CodePilot Pro", amountCents: 2000, currency: "USD", cycle: "monthly",
    dates: { kind: "next", offset: 12 }, category: "AI", scope: "business", paymentMethod: BUSINESS,
    accountLabel: "work@example.com" },
];

export const STARTER_KEYS: readonly number[] = [1, 2, 3, 4];
export const FULL_KEYS: readonly number[] = SEED_SPECS.map((s) => s.key);
