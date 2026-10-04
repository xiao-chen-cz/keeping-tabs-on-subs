"use client";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { CANCEL_CHANNEL_LABELS } from "@/lib/domain/cancellation";
import { CANCEL_CHANNELS } from "@/lib/domain/types";
import {
  INITIAL_CANCEL_STATE,
  type CancelFormField,
  type CancelFormState,
  type CancelFormValues,
} from "@/lib/validation/cancel-form";

const inputClass = "input";

function Field({ name, label, errors, hint, children }: { name: string; label: string; errors?: string[]; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="label">
        {label}
      </label>
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

export function CancelForm({
  action,
  today,
  cancelHref,
}: {
  action: (prev: CancelFormState, formData: FormData) => Promise<CancelFormState>;
  /** Default for "Cancelled on": today in the user's time zone. */
  today: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CANCEL_STATE);
  const [vals, setVals] = useState<CancelFormValues>({
    occurredOn: today,
    channel: "",
    reference: "",
    note: "",
    accessUntil: "",
  });
  const errors = state.fieldErrors;
  const bind = (name: CancelFormField) => ({
    id: name,
    name,
    value: vals[name],
    onChange: (e: { target: { value: string } }) => setVals((v) => ({ ...v, [name]: e.target.value })),
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field name="occurredOn" label="Cancelled on" errors={errors.occurredOn}>
        <input {...bind("occurredOn")} type="date" className={inputClass} />
      </Field>
      <Field name="channel" label="How" errors={errors.channel}>
        <select {...bind("channel")} className={inputClass}>
          <option value="">Choose...</option>
          {CANCEL_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CANCEL_CHANNEL_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        name="reference"
        label="Confirmation number (optional)"
        errors={errors.reference}
        hint="A confirmation or ticket number. Never a card or account number."
      >
        <input {...bind("reference")} type="text" autoComplete="off" className={inputClass} />
      </Field>
      <Field name="note" label="Note (optional)" errors={errors.note}>
        <textarea {...bind("note")} rows={3} className={inputClass} />
      </Field>
      <Field
        name="accessUntil"
        label="Access until (optional)"
        errors={errors.accessUntil}
        hint="If the service keeps working until a later date, it shows under Ending until then."
      >
        <input {...bind("accessUntil")} type="date" className={inputClass} />
      </Field>
      <div className="flex items-center gap-4 pb-8 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Saving..." : "Mark as cancelled"}
        </button>
        <Link href={cancelHref} className="link inline-flex min-h-11 items-center text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}
