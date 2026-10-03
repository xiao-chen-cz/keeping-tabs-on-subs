// Validation for the add and edit subscription forms. Server action and client hints share it.
// Input is FormData-like strings (empty string = not set). Output maps to DB insert columns.
// Never accepts user_id, source or computed fields: unknown keys are dropped.
import { z } from "zod";
import {
  BILLING_CYCLES,
  CONFIDENCES,
  CURRENCIES,
  REQUIRED_FOR_APPROVAL,
  SCOPES,
  SUBSCRIPTION_STATUSES,
} from "@/lib/domain/types";

export type FormMode = "create" | "edit";

export interface SubscriptionFormData {
  name: string;
  status: (typeof SUBSCRIPTION_STATUSES)[number];
  amount: string | null;
  currency: (typeof CURRENCIES)[number] | null;
  billing_cycle: (typeof BILLING_CYCLES)[number] | null;
  last_renewal_date: string | null;
  trial_ends: string | null;
  cancel_notice_days: number | null;
  regular_price: string | null;
  promo_ends: string | null;
  access_until: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  scope: (typeof SCOPES)[number] | null;
  confidence: (typeof CONFIDENCES)[number] | null;
  vendor: string | null;
  plan: string | null;
  cancel_url: string | null;
  notes: string | null;
}

export type ParseResult =
  | { ok: true; data: SubscriptionFormData }
  | { ok: false; fieldErrors: Record<string, string[]> };

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const trimmed = (v: unknown) => (typeof v === "string" ? blank(v.trim()) : v);

const text = z.preprocess(trimmed, z.string().optional());

const enumField = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(trimmed, z.enum(values, { error: message }).optional());

const dateField = z.preprocess(
  trimmed,
  z
    .string()
    .refine(isValidIsoDate, { error: "Enter a valid date" })
    .optional(),
);

const uuidField = z.preprocess(trimmed, z.uuid({ error: "Choose from the list" }).optional());

/** "9,99" or "9.99" -> "9.99". Null when not a non-negative number with at most 2 decimals. */
function normalizeMoney(raw: string): string | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n > 99_999_999.99) return null;
  return n.toFixed(2);
}

function moneyField(requiredMessage: string) {
  return z.preprocess(
    trimmed,
    z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (v === undefined) return undefined;
        const m = normalizeMoney(v);
        if (m === null) {
          ctx.addIssue({ code: "custom", message: requiredMessage });
          return z.NEVER;
        }
        return m;
      }),
  );
}

function isValidIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

const noticeDays = z.preprocess(
  trimmed,
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      if (!/^\d+$/.test(v) || Number(v) > 365) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number from 0 to 365" });
        return z.NEVER;
      }
      return Number(v);
    }),
);

const cancelUrl = z.preprocess(
  trimmed,
  z
    .string()
    .optional()
    .refine(
      (v) => {
        if (v === undefined) return true;
        try {
          return new URL(v).protocol === "https:";
        } catch {
          return false;
        }
      },
      { error: "Enter a link starting with https://" },
    ),
);

const fieldsSchema = z.object({
  name: z.preprocess(trimmed, z.string({ error: "Enter a name" }).min(1, "Enter a name")),
  status: z.preprocess(
    trimmed,
    z.enum(SUBSCRIPTION_STATUSES, { error: "Choose a status" }).default("confirmed"),
  ),
  amount: moneyField("Enter an amount like 9.99"),
  currency: enumField(CURRENCIES, "Choose a currency"),
  billing_cycle: enumField(BILLING_CYCLES, "Choose a billing cycle"),
  last_renewal_date: dateField,
  trial_ends: dateField,
  cancel_notice_days: noticeDays,
  regular_price: moneyField("Enter a price like 9.99"),
  promo_ends: dateField,
  access_until: dateField,
  category_id: uuidField,
  payment_method_id: uuidField,
  scope: enumField(SCOPES, "Choose a scope"),
  confidence: enumField(CONFIDENCES, "Choose a confidence"),
  vendor: text,
  plan: text,
  cancel_url: cancelUrl,
  notes: text,
});

type Parsed = z.output<typeof fieldsSchema>;

function addError(errors: Record<string, string[]>, field: string, message: string) {
  (errors[field] ??= []).push(message);
}

export function parseSubscriptionForm(
  values: Record<string, string | undefined>,
  mode: FormMode,
): ParseResult {
  const result = fieldsSchema.safeParse(values);
  const errors: Record<string, string[]> = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      addError(errors, String(issue.path[0] ?? "form"), issue.message);
    }
    // Missing-name message is friendlier than zod's "expected string".
    if (errors.name && values.name === undefined) errors.name = ["Enter a name"];
  }

  // Cross-field rules run on whatever parsed, so one submit reports every problem.
  const p: Partial<Parsed> = result.success ? result.data : partialParse(values);

  if (p.amount !== undefined && p.currency === undefined && !errors.currency) {
    addError(errors, "currency", "Choose a currency for the amount");
  }
  if (p.regular_price !== undefined && p.promo_ends === undefined && !errors.promo_ends) {
    addError(errors, "promo_ends", "Enter the date the promo ends, or clear the regular price");
  }
  if (p.promo_ends !== undefined && p.regular_price === undefined && !errors.regular_price) {
    addError(errors, "regular_price", "Enter the regular price, or clear the promo end date");
  }

  // On edit a missing status must not silently default to confirmed (it would reopen a cancelled row).
  if (mode === "edit" && !values.status?.trim() && !errors.status) {
    addError(errors, "status", "Choose a status");
  }

  if (mode === "create" && p.status !== "cancelled") {
    if (p.amount === undefined && !errors.amount) addError(errors, "amount", "Enter an amount");
    if (p.currency === undefined && !errors.currency) {
      addError(errors, "currency", "Choose a currency");
    }
    if (p.billing_cycle === undefined && !errors.billing_cycle) {
      addError(errors, "billing_cycle", "Choose a billing cycle");
    }
    if (
      p.last_renewal_date === undefined &&
      p.trial_ends === undefined &&
      !errors.last_renewal_date &&
      !errors.trial_ends
    ) {
      addError(errors, "last_renewal_date", "Enter the last renewal date or the trial end date");
    }
  }

  if (Object.keys(errors).length > 0 || !result.success) {
    return { ok: false, fieldErrors: errors };
  }

  const d = result.data;
  const data: SubscriptionFormData = {
    name: d.name,
    status: d.status,
    amount: d.amount ?? null,
    currency: d.currency ?? null,
    billing_cycle: d.billing_cycle ?? null,
    last_renewal_date: d.last_renewal_date ?? null,
    trial_ends: d.trial_ends ?? null,
    cancel_notice_days: d.cancel_notice_days ?? null,
    regular_price: d.regular_price ?? null,
    promo_ends: d.promo_ends ?? null,
    // Cleared when the status is (or goes back to) confirmed.
    access_until: d.status === "cancelled" ? (d.access_until ?? null) : null,
    category_id: d.category_id ?? null,
    payment_method_id: d.payment_method_id ?? null,
    scope: d.scope ?? null,
    confidence: d.confidence ?? null,
    vendor: d.vendor ?? null,
    plan: d.plan ?? null,
    cancel_url: d.cancel_url ?? null,
    notes: d.notes ?? null,
  };
  return { ok: true, data };
}

/** Per-field best effort for cross-field checks when some other field failed. */
function partialParse(values: Record<string, string | undefined>): Partial<Parsed> {
  const out: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(fieldsSchema.shape)) {
    const r = (schema as z.ZodType).safeParse(values[key]);
    if (r.success) out[key] = r.data;
  }
  return out as Partial<Parsed>;
}

type Approvable = Partial<
  Pick<
    SubscriptionFormData,
    "name" | "amount" | "currency" | "billing_cycle" | "last_renewal_date" | "trial_ends"
  >
>;

const FIELD_FOR_REQUIREMENT: Record<(typeof REQUIRED_FOR_APPROVAL)[number], string> = {
  name: "name",
  amountCents: "amount",
  currency: "currency",
  billingCycle: "billing_cycle",
  "lastRenewalDate|trialEnds": "last_renewal_date",
};

/** Form field names still missing for approval (REQUIRED_FOR_APPROVAL). Used for edit hints. */
export function missingForApproval(data: Approvable): string[] {
  const has = (v: unknown) => v !== null && v !== undefined && v !== "";
  const present: Record<(typeof REQUIRED_FOR_APPROVAL)[number], boolean> = {
    name: has(data.name),
    amountCents: has(data.amount),
    currency: has(data.currency),
    billingCycle: has(data.billing_cycle),
    "lastRenewalDate|trialEnds": has(data.last_renewal_date) || has(data.trial_ends),
  };
  return REQUIRED_FOR_APPROVAL.filter((k) => !present[k]).map((k) => FIELD_FOR_REQUIREMENT[k]);
}
