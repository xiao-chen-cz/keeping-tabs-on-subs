"use client";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { defaultNoticeDays } from "@/lib/domain/notice";
import {
  BILLING_CYCLES,
  BILLING_CYCLE_LABELS,
  CONFIDENCES,
  CURRENCIES,
  SCOPES,
  SUBSCRIPTION_STATUSES,
  type BillingCycle,
} from "@/lib/domain/types";
import { missingForApproval, type SubscriptionFormData } from "@/lib/validation/subscription-form";
import {
  INITIAL_FORM_STATE,
  type FormField,
  type FormValues,
  type SubscriptionFormState,
} from "./subscription-form-values";

export interface LookupOption {
  id: string;
  name: string;
}

export interface SubscriptionFormProps {
  mode: "create" | "edit";
  /** A Server Action (id already bound for edit) or a stub in tests. */
  action: (prev: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  initialValues: FormValues;
  lookups: { categories: LookupOption[]; paymentMethods: LookupOption[] };
  cancelHref: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  amount: "Amount",
  currency: "Currency",
  billing_cycle: "Billing cycle",
  last_renewal_date: "Billing date (or trial end date)",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const inputClass =
  "w-full min-h-12 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700";

function Field({
  name,
  label,
  errors,
  hint,
  children,
}: {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} id={`${name}-error`} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {e}
        </p>
      ))}
    </div>
  );
}

export function SubscriptionForm({ mode, action, initialValues, lookups, cancelHref }: SubscriptionFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  // Controlled, so React's post-action form reset cannot wipe what the user typed.
  const [vals, setVals] = useState<FormValues>(initialValues);
  const errors = state.fieldErrors;

  const bind = (name: FormField) => ({
    id: name,
    name,
    value: vals[name],
    onChange: (e: { target: { value: string } }) => setVals((v) => ({ ...v, [name]: e.target.value })),
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  const cycle = (BILLING_CYCLES as readonly string[]).includes(vals.billing_cycle)
    ? (vals.billing_cycle as BillingCycle)
    : null;
  const noticeDefault = defaultNoticeDays(cycle);

  const missing =
    mode === "edit"
      ? missingForApproval({
          name: vals.name,
          amount: vals.amount,
          currency: (vals.currency || null) as SubscriptionFormData["currency"],
          billing_cycle: cycle,
          last_renewal_date: vals.last_renewal_date,
          trial_ends: vals.trial_ends,
        }).filter(() => vals.status !== "cancelled")
      : [];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === "edit" && missing.length > 0 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Still missing: {missing.map((f) => FIELD_LABELS[f] ?? f).join(", ")}. You can save without them, but this
          entry stays under Needs update.
        </p>
      )}

      <Field name="name" label="Name *" errors={errors.name}>
        <input {...bind("name")} type="text" required autoComplete="off" className={inputClass} />
      </Field>

      <Field name="status" label="Status" errors={errors.status}>
        <select {...bind("status")} className={inputClass}>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field name="amount" label="Amount" errors={errors.amount}>
          <input {...bind("amount")} type="text" inputMode="decimal" placeholder="9.99" className={inputClass} />
        </Field>
        <Field name="currency" label="Currency" errors={errors.currency}>
          <select {...bind("currency")} className={inputClass}>
            <option value="">-</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field name="billing_cycle" label="Billing cycle" errors={errors.billing_cycle}>
        <select {...bind("billing_cycle")} className={inputClass}>
          <option value="">Choose...</option>
          {BILLING_CYCLES.map((c) => (
            <option key={c} value={c}>
              {BILLING_CYCLE_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field name="last_renewal_date" label="Billing date (last or next charge)" errors={errors.last_renewal_date}>
        <input {...bind("last_renewal_date")} type="date" className={inputClass} />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">The most recent charge, or the next one if you know it.</p>
      </Field>

      <Field name="trial_ends" label="Trial ends" errors={errors.trial_ends}>
        <input {...bind("trial_ends")} type="date" className={inputClass} />
      </Field>

      <Field
        name="cancel_notice_days"
        label="Cancel notice (days)"
        errors={errors.cancel_notice_days}
        hint="Leave empty to use the default."
      >
        <input
          {...bind("cancel_notice_days")}
          type="text"
          inputMode="numeric"
          placeholder={`${noticeDefault} (default)`}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field name="regular_price" label="Regular price" errors={errors.regular_price}>
          <input {...bind("regular_price")} type="text" inputMode="decimal" className={inputClass} />
        </Field>
        <Field name="promo_ends" label="Promo ends" errors={errors.promo_ends}>
          <input {...bind("promo_ends")} type="date" className={inputClass} />
        </Field>
      </div>

      {vals.status === "cancelled" && (
        <Field name="access_until" label="Access until" errors={errors.access_until}>
          <input {...bind("access_until")} type="date" className={inputClass} />
        </Field>
      )}

      <Field name="category_id" label="Category" errors={errors.category_id}>
        <select {...bind("category_id")} className={inputClass}>
          <option value="">-</option>
          {lookups.categories.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <Field name="payment_method_id" label="Payment method" errors={errors.payment_method_id}>
        <select {...bind("payment_method_id")} className={inputClass}>
          <option value="">-</option>
          {lookups.paymentMethods.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <Field name="scope" label="Scope" errors={errors.scope}>
        <select {...bind("scope")} className={inputClass}>
          <option value="">-</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>
      </Field>

      <Field name="confidence" label="Confidence" errors={errors.confidence}>
        <select {...bind("confidence")} className={inputClass}>
          <option value="">-</option>
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>
              {cap(c)}
            </option>
          ))}
        </select>
      </Field>

      <Field name="vendor" label="Vendor" errors={errors.vendor}>
        <input {...bind("vendor")} type="text" className={inputClass} />
      </Field>

      <Field name="plan" label="Plan" errors={errors.plan}>
        <input {...bind("plan")} type="text" className={inputClass} />
      </Field>

      <Field name="cancel_url" label="Cancel link" errors={errors.cancel_url}>
        <input {...bind("cancel_url")} type="url" inputMode="url" placeholder="https://" className={inputClass} />
      </Field>

      <Field name="notes" label="Notes" errors={errors.notes}>
        <textarea {...bind("notes")} rows={3} className={inputClass} />
      </Field>

      <div className="flex items-center gap-4 pb-8 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-indigo-600 px-6 font-medium text-white active:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : mode === "create" ? "Add subscription" : "Save changes"}
        </button>
        <Link href={cancelHref} className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400">
          Cancel
        </Link>
      </div>
    </form>
  );
}
