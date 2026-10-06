"use client";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import {
  MAX_IMAGE_EDGE,
  MAX_UPLOAD_BYTES,
  UPLOAD_TYPES,
  isUploadMimeType,
  scaledSize,
  type UploadMimeType,
} from "@/lib/extraction/limits";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export interface CaptureFormState {
  error: string | null;
}

type Kind = "text" | "upload" | "paste";

const TABS: { kind: Kind; label: string }[] = [
  { kind: "text", label: "Describe" },
  { kind: "upload", label: "Screenshot or PDF" },
  { kind: "paste", label: "Paste email" },
];

/** Image to upload: unchanged when it is small and an accepted type, otherwise redrawn as JPEG (plan B6). */
async function prepareImage(file: File): Promise<{ blob: Blob; mimeType: UploadMimeType }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledSize(bitmap.width, bitmap.height);
  if (isUploadMimeType(file.type) && width === bitmap.width && file.size <= 4 * 1024 * 1024) {
    bitmap.close();
    return { blob: file, mimeType: file.type };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("encode");
  return { blob, mimeType: "image/jpeg" };
}

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
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = pending || uploading;
  const error = localError ?? state.error;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const form = new FormData(e.currentTarget);
    if (kind !== "upload") {
      startTransition(() => formAction(form));
      return;
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setLocalError("Choose a screenshot, photo or PDF first.");
      return;
    }
    setUploading(true);
    try {
      let blob: Blob = file;
      let mimeType: UploadMimeType;
      if (file.type === "application/pdf") {
        mimeType = "application/pdf";
      } else if (file.type.startsWith("image/")) {
        ({ blob, mimeType } = await prepareImage(file));
      } else {
        setLocalError("That file is not a picture or PDF.");
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setLocalError("That file is larger than 10 MB.");
        return;
      }
      const captureId = crypto.randomUUID();
      const path = `${userId}/${captureId}.${UPLOAD_TYPES[mimeType]}`;
      const { error: uploadError } = await createBrowserSupabase()
        .storage.from("captures")
        .upload(path, blob, { contentType: mimeType, upsert: false });
      if (uploadError) {
        setLocalError("The upload failed. Check your connection and try again.");
        return;
      }
      const fd = new FormData();
      fd.set("kind", "upload");
      fd.set("captureId", captureId);
      fd.set("mimeType", mimeType);
      startTransition(() => formAction(fd));
    } catch {
      setLocalError("That picture could not be opened. Try a screenshot instead.");
    } finally {
      setUploading(false);
    }
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
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            <span className="label">A screenshot of a billing page, a photo of an invoice, or a PDF (max 10 MB)</span>
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="input py-2"
              disabled={busy}
            />
          </label>
          <span className="text-xs text-mid">Pictures are made smaller (up to {MAX_IMAGE_EDGE} px) before they are sent.</span>
        </div>
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
