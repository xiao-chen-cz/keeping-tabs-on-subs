"use client";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import { ScreenshotField, usePastedFile } from "@/components/screenshot-field";
import { uploadCaptureFile } from "@/lib/capture-upload";
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
  userId,
  today,
  cancelHref,
  initial,
}: {
  action: (prev: CancelFormState, formData: FormData) => Promise<CancelFormState>;
  /** Owner of the Storage folder the confirmation screenshot is uploaded to. */
  userId: string;
  /** Default for "Cancelled on": today in the user's time zone. */
  today: string;
  cancelHref: string;
  /** Optional prefill (e.g. the trial ended without converting). The user can change everything. */
  initial?: Partial<CancelFormValues>;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CANCEL_STATE);
  const [vals, setVals] = useState<CancelFormValues>({
    occurredOn: today,
    channel: "",
    reference: "",
    note: "",
    accessUntil: "",
    ...initial,
  });
  const [file, setFile] = useState<File | null>(null);
  // The last upload, reused when the form comes back with errors so the same file is not stored twice.
  const [uploaded, setUploaded] = useState<{ file: File; captureId: string; mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const busy = pending || uploading;
  const errors = state.fieldErrors;

  usePastedFile((f) => {
    setFileError(null);
    setFile(f);
  }, !busy);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFileError(null);
    const form = new FormData(e.currentTarget);
    if (file) {
      let proof = uploaded?.file === file ? uploaded : null;
      if (!proof) {
        setUploading(true);
        const result = await uploadCaptureFile(file, userId);
        setUploading(false);
        if (!result.ok) {
          setFileError(result.error);
          return;
        }
        proof = { file, captureId: result.captureId, mimeType: result.mimeType };
        setUploaded(proof);
      }
      form.set("captureId", proof.captureId);
      form.set("mimeType", proof.mimeType);
    }
    startTransition(() => formAction(form));
  }
  const bind = (name: CancelFormField) => ({
    id: name,
    name,
    value: vals[name],
    onChange: (e: { target: { value: string } }) => setVals((v) => ({ ...v, [name]: e.target.value })),
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
      <ScreenshotField
        id="confirmation"
        label="Confirmation screenshot (optional)"
        hint="The cancellation email or page, as proof. Picture or PDF, max 10 MB."
        file={file}
        onFile={(f) => {
          setFileError(null);
          setFile(f);
        }}
        disabled={busy}
      />
      {[fileError, ...(errors.captureId ?? [])].filter(Boolean).map((e) => (
        <p key={e} role="alert" className="text-sm text-danger">
          {e}
        </p>
      ))}
      <div className="flex items-center gap-4 pb-8 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary"
        >
          {uploading ? "Uploading..." : pending ? "Saving..." : "Mark as cancelled"}
        </button>
        <Link href={cancelHref} className="link inline-flex min-h-11 items-center text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}
