"use client";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { ScreenshotField, usePastedFile } from "@/components/screenshot-field";
import { uploadCaptureFile } from "@/lib/capture-upload";
import { MAX_IMAGE_EDGE } from "@/lib/extraction/limits";

export interface CaptureFormState {
  error: string | null;
}

type Kind = "text" | "upload" | "paste";

const TABS: { kind: Kind; label: string }[] = [
  { kind: "text", label: "Describe" },
  { kind: "upload", label: "Screenshot or PDF" },
  { kind: "paste", label: "Paste email" },
];

/** Typed description, upload, or pasted email (D16–20). Every path ends in one extraction and the review screen. */
export function CaptureForm({
  action,
  userId,
}: {
  action: (prev: CaptureFormState, formData: FormData) => Promise<CaptureFormState>;
  userId: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [kind, setKind] = useState<Kind>("text");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = pending || uploading;
  const error = localError ?? state.error;

  // A screenshot pasted anywhere on the page goes to the upload tab, whichever tab is open.
  usePastedFile((f) => {
    setKind("upload");
    setLocalError(null);
    setFile(f);
  }, !busy);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = new FormData(e.currentTarget);
    if (kind !== "upload") {
      startTransition(() => formAction(form));
      return;
    }
    if (!file) {
      setLocalError("Choose a screenshot, photo or PDF first.");
      return;
    }
    setUploading(true);
    const result = await uploadCaptureFile(file, userId);
    setUploading(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    const fd = new FormData();
    fd.set("kind", "upload");
    fd.set("captureId", result.captureId);
    fd.set("mimeType", result.mimeType);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 text-sm">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="How do you want to add it?">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            aria-pressed={kind === t.kind}
            onClick={() => {
              setKind(t.kind);
              setLocalError(null);
            }}
            className={kind === t.kind ? "btn-primary" : "btn-secondary"}
            disabled={busy}
          >
            {t.label}
          </button>
        ))}
      </div>

      {kind === "text" && (
        <label className="flex flex-col gap-1">
          <span className="label">Describe the subscription in your own words</span>
          <textarea
            name="text"
            rows={4}
            className="input"
            placeholder="e.g. NoteForge Pro, 12 dollars a month, next charge on the 30th"
            disabled={busy}
          />
        </label>
      )}
      {kind === "paste" && (
        <label className="flex flex-col gap-1">
          <span className="label">Paste the receipt, invoice or reminder email</span>
          <textarea name="text" rows={8} className="input" placeholder="Paste the email text here" disabled={busy} />
        </label>
      )}
      {kind === "upload" && (
        <ScreenshotField
          id="file"
          label="A screenshot of a billing page, a photo of an invoice, or a PDF (max 10 MB)"
          hint={`Pictures are made smaller (up to ${MAX_IMAGE_EDGE} px) before they are sent.`}
          file={file}
          onFile={setFile}
          disabled={busy}
        />
      )}

      <p className="text-xs text-mid">
        To read it, the app sends this capture (and nothing else from your account) once to Anthropic&apos;s Claude model,
        which runs outside the EU. You then check the proposal: nothing is added to your list until you approve it.
      </p>

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="text-mid">
          {uploading ? "Uploading…" : "Reading your capture… this takes about 10 seconds."}
        </p>
      )}
      <div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Reading…" : "Read it"}
        </button>
      </div>
    </form>
  );
}
