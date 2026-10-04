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
  type BillingCycle,
  type Confidence,
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
  /** Hide the read-only status line (review: approval always yields a Confirmed row). */
  hideStatus?: boolean;
  /** Submit button text; defaults to "Add subscription" / "Save changes". */
  submitLabel?: string;
  /** Disables the submit button (review: until every question is answered). */
  submitDisabled?: boolean;
  /** Controlled mode: the parent owns the values (review answers fill the form). */
  values?: FormValues;
  onValuesChange?: (values: FormValues) => void;
  /** Small "low" / "medium" marker next to fields whose extraction confidence is not high. */
  confidenceFlags?: Partial<Record<FormField, Exclude<Confidence, "high">>>;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  amount: "Amount",
  currency: "Currency",
  billing_cycle: "Billing cycle",
  last_renewal_date: "Billing date (or trial end date)",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const inputClass = "input";

function Field({
  name,
  label,
  errors,
  hint,
  flag,
  children,
}: {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  flag?: "low" | "medium";
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={name} className="label">
          {label}
        </label>
        {flag && (
          <span
            data-confidence={flag}
            title="How sure the capture reading was"
            className={`pill ${
              flag === "low"
                ? "border-danger text-danger"
                : "border-warn-line bg-warn-bg text-warn-ink"
            }`}
          >
            {flag}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-mid">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} id={`${name}-error`} role="alert" className="text-sm text-danger">
          {e}
        </p>
      ))}
    </div>
  );
}

export function SubscriptionForm({
  mode,
  action,
  initialValues,
  lookups,
  cancelHref,
  hideStatus,
  submitLabel,
  submitDisabled,
  values,
  onValuesChange,
  confidenceFlags,
}: SubscriptionFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  // Controlled, so React's post-action form reset cannot wipe what the user typed.
  const [inner, setInner] = useState<FormValues>(initialValues);
  const vals = values ?? inner;
  const errors = state.fieldErrors;

  const bind = (name: FormField) => ({
    id: name,
    name,
    value: vals[name],
    onChange: (e: { target: { value: string } }) => {
      const next = { ...vals, [name]: e.target.value };
      setInner(next);
      onValuesChange?.(next);
    },
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
    <form action={formAction} className="flex flex-col gap-3">
      {mode === "edit" && missing.length > 0 && (
        <p className="rounded-control border border-warn-line bg-warn-bg p-3 text-sm text-warn-ink">
          Still missing: {missing.map((f) => FIELD_LABELS[f] ?? f).join(", ")}. You can save without them, but this
          entry stays under Needs update.
        </p>
      )}

      <Field name="name" flag={confidenceFlags?.name} label="Name *" errors={errors.name}>
        <input {...bind("name")} type="text" required autoComplete="off" className={inputClass} />
      </Field>

      {mode === "edit" && !hideStatus && (
        <p className="text-sm">
          <span className="font-semibold">Status:</span> {cap(vals.status || "confirmed")}
          <span className="block text-xs text-mid">
            To cancel or reopen, use the buttons on the subscription page.
          </span>
        </p>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field name="amount" flag={confidenceFlags?.amount} label="Amount" errors={errors.amount}>
          <input {...bind("amount")} type="text" inputMode="decimal" placeholder="9.99" className={inputClass} />
        </Field>
        <Field name="currency" flag={confidenceFlags?.currency} label="Currency" errors={errors.currency}>
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

      <Field name="billing_cycle" flag={confidenceFlags?.billing_cycle} label="Billing cycle" errors={errors.billing_cycle}>
        <select {...bind("billing_cycle")} className={inputClass}>
          <option value="">Choose...</option>
          {BILLING_CYCLES.map((c) => (
            <option key={c} value={c}>
              {BILLING_CYCLE_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field name="last_renewal_date" flag={confidenceFlags?.last_renewal_date} label="Billing date (last or next charge)" errors={errors.last_renewal_date}>
        <input {...bind("last_renewal_date")} type="date" className={inputClass} />
        <p className="mt-1 text-xs text-mid">The most recent charge, or the next one if you know it.</p>
      </Field>

      <Field name="trial_ends" flag={confidenceFlags?.trial_ends} label="Trial ends" errors={errors.trial_ends}>
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
        <Field name="regular_price" flag={confidenceFlags?.regular_price} label="Regular price" errors={errors.regular_price}>
          <input {...bind("regular_price")} type="text" inputMode="decimal" className={inputClass} />
        </Field>
        <Field name="promo_ends" flag={confidenceFlags?.promo_ends} label="Promo ends" errors={errors.promo_ends}>
          <input {...bind("promo_ends")} type="date" className={inputClass} />
        </Field>
      </div>

      <Field name="category_id" flag={confidenceFlags?.category_id} label="Category" errors={errors.category_id}>
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

      <Field name="scope" flag={confidenceFlags?.scope} label="Scope" errors={errors.scope}>
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

      <div className="flex items-center gap-4 pb-8 pt-1">
        <button
          type="submit"
          disabled={pending || submitDisabled}
          className="btn-primary"
        >
          {pending ? "Saving..." : (submitLabel ?? (mode === "create" ? "Add subscription" : "Save changes"))}
        </button>
        <Link href={cancelHref} className="link inline-flex min-h-11 items-center text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
