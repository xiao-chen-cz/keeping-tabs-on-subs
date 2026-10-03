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

const inputClass =
  "w-full min-h-12 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700";

function Field({ name, label, errors, hint, children }: { name: string; label: string; errors?: string[]; hint?: string; children: ReactNode }) {
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
    <form action={formAction} className="flex flex-col gap-4">
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
      <div className="flex items-center gap-4 pb-8 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-indigo-600 px-6 font-medium text-white active:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Mark as cancelled"}
        </button>
        <Link href={cancelHref} className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400">
          Back
        </Link>
      </div>
    </form>
  );
}
