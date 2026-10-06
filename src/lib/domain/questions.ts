// Fixed questions for the missing required fields. The wording and options come from code; the model
// never invents a question. Answers are parsed by code (no model calls here).
import { isPlainDate } from "@/lib/dates/plain-date";
import type { RequiredField } from "@/lib/domain/proposal";
import {
  BILLING_CYCLE_LABELS,
  BILLING_CYCLES,
  CURRENCIES,
  type BillingCycle,
  type Currency,
} from "@/lib/domain/types";

export type Question =
  | { field: "name"; prompt: string; input: "text" }
  | { field: "amountCents"; prompt: string; input: "decimal" }
  | { field: "currency"; prompt: string; input: "options"; options: { value: Currency; label: string }[] }
  | { field: "billingCycle"; prompt: string; input: "options"; options: { value: BillingCycle; label: string }[] }
  | { field: "lastRenewalDate|trialEnds"; prompt: string; input: "date" };

export const QUESTIONS: Record<RequiredField, Question> = {
  name: { field: "name", prompt: "What is the subscription called?", input: "text" },
  amountCents: { field: "amountCents", prompt: "How much is each charge?", input: "decimal" },
  currency: {
    field: "currency",
    prompt: "Which currency?",
    input: "options",
    options: CURRENCIES.map((c) => ({ value: c, label: c })),
  },
  billingCycle: {
    field: "billingCycle",
    prompt: "How often is it charged?",
    input: "options",
    options: BILLING_CYCLES.map((c) => ({ value: c, label: BILLING_CYCLE_LABELS[c] })),
  },
  "lastRenewalDate|trialEnds": {
    field: "lastRenewalDate|trialEnds",
    prompt: "When was the last charge, or when is the next one?",
    input: "date",
  },
};

export function questionsFor(missing: readonly RequiredField[]): Question[] {
  return missing.map((f) => QUESTIONS[f]);
}

/** "9,99" or "9.99" -> 999. Null when not a non-negative amount with at most 2 decimals. */
export function parseAmountCents(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return Number.isSafeInteger(cents) && cents <= 9_999_999_999 ? cents : null;
}

function parseOption<T extends string>(raw: string, values: readonly T[], labels?: Record<T, string>): T | null {
  const s = raw.trim().toLowerCase();
  if (s === "") return null;
  return values.find((v) => v.toLowerCase() === s || labels?.[v].toLowerCase() === s) ?? null;
}

/**
 * Parses a typed or tapped answer. Returns the value (name string, amount in cents, currency, cycle, or an
 * ISO date for the date question) or null when the answer cannot be parsed by code.
 */
export function parseAnswer(field: RequiredField, raw: string): string | number | null {
  switch (field) {
    case "name": {
      const s = raw.trim();
      return s === "" ? null : s;
    }
    case "amountCents":
      return parseAmountCents(raw);
    case "currency":
      return parseOption(raw, CURRENCIES);
    case "billingCycle":
      return parseOption(raw, BILLING_CYCLES, BILLING_CYCLE_LABELS);
    case "lastRenewalDate|trialEnds": {
      const s = raw.trim();
      return isPlainDate(s) ? s : null;
    }
  }
}
