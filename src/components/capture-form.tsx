"use client";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { ScreenshotField, usePastedFile } from "@/components/screenshot-field";
import { uploadCaptureFile } from "@/lib/capture-upload";
import { MAX_IMAGE_EDGE } from "@/lib/extraction/limits";

export interface CaptureFormState {
  error: string | null;
}

type Kind = "photo" | "upload" | "text";

// Take photo is for phones only (touch screens); a desktop shows Upload and Type or paste.
const TABS: { kind: Kind; label: string; className?: string }[] = [
  { kind: "photo", label: "Take photo", className: "hidden pointer-coarse:inline-flex" },
  { kind: "upload", label: "Upload" },
  { kind: "text", label: "Type or paste" },
];

/**
 * Photo (phones), upload, or typed/pasted text (D16–20). Every path ends in one extraction and the review screen.
 * Typed and pasted text are one box and are saved as kind "text"; older captures may still be "paste".
 */
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
  const camera = useRef<HTMLInputElement>(null);
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
    if (kind === "text") {
      startTransition(() => formAction(form));
      return;
    }
    if (!file) {
      setLocalError(kind === "photo" ? "Take a photo first." : "Choose a screenshot, photo or PDF first.");
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
              // Take photo opens the camera straight away.
              if (t.kind === "photo") camera.current?.click();
            }}
            className={`${kind === t.kind ? "btn-primary" : "btn-secondary"} ${t.className ?? ""}`}
            disabled={busy}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Camera"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const photo = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (photo) {
            setLocalError(null);
            setFile(photo);
          }
        }}
      />
      {kind === "photo" && (
        <PhotoPreview
          file={file}
          onRetake={() => camera.current?.click()}
          onRemove={() => setFile(null)}
          disabled={busy}
        />
      )}
      {kind === "text" && (
        <label className="flex flex-col gap-1">
          <span className="label">Describe the subscription in a few words, or paste a receipt or reminder email</span>
          <textarea
            name="text"
            rows={6}
            className="input"
            placeholder="e.g. NoteForge Pro, 12 dollars a month, next charge on the 30th"
            disabled={busy}
          />
        </label>
      )}
      {kind === "upload" && (
        <>
          {/* Phones only: on a desktop, pasting the email text is easier. */}
          <p className="hidden text-sm text-mid pointer-coarse:block">Got an email? Take a screenshot, copy it, then tap Paste screenshot.</p>
          <ScreenshotField
            id="file"
            camera={false}
            label="A screenshot of a billing page, a photo of an invoice, or a PDF (max 10 MB)"
            hint={`Pictures are made smaller (up to ${MAX_IMAGE_EDGE} px) before they are sent.`}
            file={file}
            onFile={setFile}
            disabled={busy}
          />
        </>
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

/** The photo just taken, with Retake and Remove; before the first photo, a button to open the camera. */
function PhotoPreview({
  file,
  onRetake,
  onRemove,
  disabled,
}: {
  file: File | null;
  onRetake: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const thumb = useRef<HTMLImageElement>(null);
  const isImage = file?.type.startsWith("image/") ?? false;
  useEffect(() => {
    if (!file || !isImage || !thumb.current) return;
    const url = URL.createObjectURL(file);
    thumb.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  if (!file) {
    return (
      <div>
        <button type="button" className="btn-secondary" onClick={onRetake} disabled={disabled}>
          Open the camera
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      {isImage ? (
        <div className="min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not an optimisable asset */}
          <img ref={thumb} alt="The photo you took" className="block h-auto max-w-full max-h-64 w-auto rounded border border-line" />
        </div>
      ) : (
        <span className="text-mid">{file.name}</span>
      )}
      <div className="flex flex-col items-start gap-2">
        <button type="button" className="link text-sm" onClick={onRetake} disabled={disabled}>
          Retake
        </button>
        <button type="button" className="link text-sm" onClick={onRemove} disabled={disabled}>
          Remove
        </button>
      </div>
    </div>
  );
}
