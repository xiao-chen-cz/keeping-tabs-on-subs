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
  action?: (prev: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  /** Public demo: no form action, nothing submits; the button is disabled and a note links to sign-in. */
  readOnly?: boolean;
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
  /** Form fields still missing for the current values: amber marker and a hidden "Missing" hint. */
  missingFields?: readonly FormField[];
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

const noopAction = async (prev: SubscriptionFormState) => prev;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const inputClass = "input";

function Field({
  name,
  label,
  errors,
  hint,
  flag,
  missing,
  children,
}: {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  flag?: "low" | "medium";
  missing?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={name} className="label">
          {label}
        </label>
        {missing && (
          <span data-missing={name} className="pill border-warn-line bg-warn-bg text-warn-ink">
            Missing
          </span>
        )}
        {missing && (
          <span id={`${name}-missing`} className="sr-only">
            Missing: required to work out the next renewal
          </span>
        )}
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
  readOnly,
  initialValues,
  lookups,
  cancelHref,
  hideStatus,
  submitLabel,
  submitDisabled,
  values,
  onValuesChange,
  missingFields,
  confidenceFlags,
}: SubscriptionFormProps) {
  const [state, formAction, pending] = useActionState(action ?? noopAction, INITIAL_FORM_STATE);
  // Controlled, so React's post-action form reset cannot wipe what the user typed.
  const [inner, setInner] = useState<FormValues>(initialValues);
  // Demo only: the submit button works once the form is complete, but shows what would happen instead of saving.
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const vals = values ?? inner;
  const errors = state.fieldErrors;

  const miss = (name: FormField) => (missingFields?.includes(name) ?? false);
  const ic = (name: FormField) => (miss(name) ? `${inputClass} border-warn-line bg-warn-bg` : inputClass);
  const describedBy = (name: FormField) =>
    [errors[name] ? `${name}-error` : null, miss(name) ? `${name}-missing` : null].filter(Boolean).join(" ") ||
    undefined;

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
    "aria-describedby": describedBy(name),
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
    <form
      action={readOnly ? undefined : formAction}
      onSubmit={
        readOnly
          ? (e) => {
              e.preventDefault();
              setDemoSubmitted(true);
            }
          : undefined
      }
      className="flex flex-col gap-3">
      {mode === "edit" && !missingFields && missing.length > 0 && (
        <p className="rounded-control border border-warn-line bg-warn-bg p-3 text-sm text-warn-ink">
          Still missing: {missing.map((f) => FIELD_LABELS[f] ?? f).join(", ")}. You can save without them, but this
          entry stays under Needs update.
        </p>
      )}

      <Field name="name" missing={miss("name")} flag={confidenceFlags?.name} label="Name *" errors={errors.name}>
        <input {...bind("name")} type="text" required autoComplete="off" className={ic("name")} />
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
        <Field name="amount" missing={miss("amount")} flag={confidenceFlags?.amount} label="Amount" errors={errors.amount}>
          <input {...bind("amount")} type="text" inputMode="decimal" placeholder="9.99" className={ic("amount")} />
        </Field>
        <Field name="currency" missing={miss("currency")} flag={confidenceFlags?.currency} label="Currency" errors={errors.currency}>
          <select {...bind("currency")} className={ic("currency")}>
            <option value="">-</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field name="billing_cycle" missing={miss("billing_cycle")} flag={confidenceFlags?.billing_cycle} label="Billing cycle" errors={errors.billing_cycle}>
        <select {...bind("billing_cycle")} className={ic("billing_cycle")}>
          <option value="">Choose...</option>
          {BILLING_CYCLES.map((c) => (
            <option key={c} value={c}>
              {BILLING_CYCLE_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field name="last_renewal_date" missing={miss("last_renewal_date")} flag={confidenceFlags?.last_renewal_date} label="Billing date (last or next charge)" errors={errors.last_renewal_date}>
        <input {...bind("last_renewal_date")} type="date" className={ic("last_renewal_date")} />
        <p className="mt-1 text-xs text-mid">The most recent charge, or the next one if you know it.</p>
      </Field>

      <Field name="trial_ends" missing={miss("trial_ends")} flag={confidenceFlags?.trial_ends} label="Trial ends" errors={errors.trial_ends}>
        <input {...bind("trial_ends")} type="date" className={ic("trial_ends")} />
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
        <Field name="regular_price" missing={miss("regular_price")} flag={confidenceFlags?.regular_price} label="Regular price" errors={errors.regular_price}>
          <input {...bind("regular_price")} type="text" inputMode="decimal" className={ic("regular_price")} />
        </Field>
        <Field name="promo_ends" missing={miss("promo_ends")} flag={confidenceFlags?.promo_ends} label="Promo ends" errors={errors.promo_ends}>
          <input {...bind("promo_ends")} type="date" className={ic("promo_ends")} />
        </Field>
      </div>

      <Field name="category_id" missing={miss("category_id")} flag={confidenceFlags?.category_id} label="Category" errors={errors.category_id}>
        <select {...bind("category_id")} className={ic("category_id")}>
          <option value="">-</option>
          {lookups.categories.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <Field name="payment_method_id" missing={miss("payment_method_id")} label="Payment method" errors={errors.payment_method_id}>
        <select {...bind("payment_method_id")} className={ic("payment_method_id")}>
          <option value="">-</option>
          {lookups.paymentMethods.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <Field name="scope" missing={miss("scope")} flag={confidenceFlags?.scope} label="Scope" errors={errors.scope}>
        <select {...bind("scope")} className={ic("scope")}>
          <option value="">-</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>
      </Field>

      <Field name="confidence" missing={miss("confidence")} label="Confidence" errors={errors.confidence}>
        <select {...bind("confidence")} className={ic("confidence")}>
          <option value="">-</option>
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>
              {cap(c)}
            </option>
          ))}
        </select>
      </Field>

      <Field name="vendor" missing={miss("vendor")} label="Vendor" errors={errors.vendor}>
        <input {...bind("vendor")} type="text" className={ic("vendor")} />
      </Field>

      <Field name="plan" missing={miss("plan")} label="Plan" errors={errors.plan}>
        <input {...bind("plan")} type="text" className={ic("plan")} />
      </Field>

      <Field
        name="account_label"
        missing={miss("account_label")}
        label="Account (optional)"
        hint="The login email or username you use with this vendor. Never a password."
        errors={errors.account_label}
      >
        <input {...bind("account_label")} type="text" autoComplete="off" className={ic("account_label")} />
      </Field>

      <Field name="cancel_url" missing={miss("cancel_url")} label="Cancel link" errors={errors.cancel_url}>
        <input {...bind("cancel_url")} type="url" inputMode="url" placeholder="https://" className={ic("cancel_url")} />
      </Field>

      <Field name="notes" missing={miss("notes")} label="Notes" errors={errors.notes}>
        <textarea {...bind("notes")} rows={3} className={ic("notes")} />
      </Field>

      <div className="flex items-center gap-4 pb-8 pt-1">
        <button
          type="submit"
          disabled={(!readOnly && pending) || submitDisabled}
          className="btn-primary"
        >
          {readOnly
            ? `${submitLabel ?? "Save"} (demo)`
            : pending
              ? "Saving..."
              : (submitLabel ?? (mode === "create" ? "Add subscription" : "Save changes"))}
        </button>
        <Link href={cancelHref} className="link inline-flex min-h-11 items-center text-sm">
          Cancel
        </Link>
      </div>
      {readOnly && !demoSubmitted && (
        <p className="-mt-6 pb-8 text-xs text-mid">
          Demo: nothing is saved. <Link href="/login" className="link">Sign in</Link> to approve or reject for real.
        </p>
      )}
      {readOnly && demoSubmitted && (
        <p role="status" className="-mt-6 mb-8 rounded-control border border-green-ink/30 bg-green-light p-3 text-sm text-green-ink">
          In your own account, this would now be saved to your list. Nothing was saved here.{" "}
          <Link href="/login" className="link">Sign in</Link> to try it with your own subscriptions.
        </p>
      )}
    </form>
  );
}
