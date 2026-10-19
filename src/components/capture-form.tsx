"use client";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CameraIcon, TextIcon, UploadIcon } from "@/components/icons";
import { ScreenshotField, usePastedFile } from "@/components/screenshot-field";
import { uploadCaptureFile } from "@/lib/capture-upload";
import type { ExtractionProvider } from "@/lib/extraction/extract";

export interface CaptureFormState {
  error: string | null;
}

type Kind = "photo" | "upload" | "text";

const READER: Record<ExtractionProvider, string> = {
  mistral: "Mistral AI (in the EU)",
  claude: "Anthropic's Claude (outside the EU)",
};

// Take photo is for phones only (touch screens); a desktop shows Upload and Enter text.
const TABS: { kind: Kind; label: string; icon: ReactNode; className?: string }[] = [
  { kind: "photo", label: "Take photo", icon: <CameraIcon />, className: "hidden pointer-coarse:flex" },
  { kind: "upload", label: "Upload", icon: <UploadIcon /> },
  { kind: "text", label: "Enter text", icon: <TextIcon /> },
];

/**
 * Photo (phones), upload, or typed/pasted text (D16–20). Every path ends in one extraction and the review screen.
 * Typed and pasted text are one box and are saved as kind "text"; older captures may still be "paste".
 */
export function CaptureForm({
  action,
  userId,
  provider,
}: {
  action: (prev: CaptureFormState, formData: FormData) => Promise<CaptureFormState>;
  userId: string;
  provider: ExtractionProvider;
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
      <div className="grid grid-flow-col auto-cols-fr gap-2" role="group" aria-label="How do you want to add it?">
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
            className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-medium disabled:opacity-60 [&_svg]:size-6 ${
              kind === t.kind ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-text active:bg-light"
            } ${t.className ?? ""}`}
            disabled={busy}
          >
            {t.icon}
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
          <span className="label">Describe it in a few words, or paste an email</span>
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
            label="Screenshot, photo or PDF (max 10 MB)"
            file={file}
            onFile={setFile}
            disabled={busy}
          />
        </>
      )}

      <p className="text-xs text-mid">
        Only this capture is sent, once, to {READER[provider]} to read it. Nothing is added until you approve it.
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
        <button type="button" className="btn-secondary gap-2" onClick={onRetake} disabled={disabled}>
          <CameraIcon />
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
