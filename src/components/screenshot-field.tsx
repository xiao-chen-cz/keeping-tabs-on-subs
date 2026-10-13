"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** First picture or PDF in a paste, or null when the clipboard holds text (so pasting text still works). */
function pastedFile(data: DataTransfer | null): File | null {
  if (!data || data.types.includes("text/plain")) return null;
  const file = Array.from(data.files).find((f) => f.type.startsWith("image/") || f.type === "application/pdf");
  if (!file) return null;
  // Clipboard screenshots are all called "image.png"; give them a clearer name for the file field.
  return file.name === "image.png" ? new File([file], "pasted-screenshot.png", { type: file.type }) : file;
}

export const NO_CLIPBOARD_IMAGE =
  "No screenshot to paste. After taking a screenshot, tap the preview, then Done → Copy and Delete.";
export const CLIPBOARD_BLOCKED = "Pasting was not allowed here. Save the screenshot and use Choose file instead.";

/**
 * The first picture on the clipboard, for the Paste screenshot button on phones (no keyboard to press ⌘V).
 * Must run inside a tap: Safari then shows its own "Paste" confirmation.
 */
export async function readClipboardImage(): Promise<{ file: File } | { error: string }> {
  if (!navigator.clipboard?.read) return { error: CLIPBOARD_BLOCKED };
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      return { file: new File([blob], `pasted-screenshot.${type.split("/")[1]}`, { type }) };
    }
    return { error: NO_CLIPBOARD_IMAGE };
  } catch {
    return { error: CLIPBOARD_BLOCKED };
  }
}

/** Calls onFile when a screenshot is pasted anywhere on the page (⌘V / Ctrl+V), while enabled. */
export function usePastedFile(onFile: (file: File) => void, enabled = true) {
  const latest = useRef(onFile);
  useEffect(() => {
    latest.current = onFile;
  });
  useEffect(() => {
    if (!enabled) return;
    function onPaste(e: ClipboardEvent) {
      const file = pastedFile(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      latest.current(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enabled]);
}

/**
 * File picker (plus a camera button on phones), a paste zone (not on phones) and a thumbnail. Controlled: the parent holds the file and uploads it on
 * submit (pair with usePastedFile so a paste anywhere on the page lands here).
 */
export function ScreenshotField({
  id,
  label,
  hint,
  file,
  onFile,
  disabled,
  camera = true,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
  /** Show the Take a photo button on touch screens (off where the page has its own camera option). */
  camera?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const thumb = useRef<HTMLImageElement>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const isImage = file?.type.startsWith("image/") ?? false;

  // Keep the native field (it shows the file name) and the thumbnail in step with the parent's file.
  useEffect(() => {
    const el = input.current;
    if (el && (el.files?.[0] ?? null) !== file) {
      const dt = new DataTransfer();
      if (file) dt.items.add(file);
      el.files = dt.files;
    }
    if (!file || !thumb.current) return;
    const url = URL.createObjectURL(file);
    thumb.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="input min-w-0 flex-1 py-2"
          disabled={disabled}
          onChange={(e) => onFile(e.currentTarget.files?.[0] ?? null)}
        />
        {/* Phones only: a copied screenshot, without saving it to the photo library first. */}
        <button
          type="button"
          className="btn-secondary hidden shrink-0 pointer-coarse:inline-flex"
          disabled={disabled}
          onClick={async () => {
            setPasteError(null);
            const result = await readClipboardImage();
            if ("file" in result) onFile(result.file);
            else setPasteError(result.error);
          }}
        >
          Paste screenshot
        </button>
        {/* Phones only: opens the camera straight away instead of the file browser. */}
        {camera && (
          <label className="btn-secondary hidden shrink-0 cursor-pointer has-disabled:opacity-60 pointer-coarse:inline-flex">
            Take a photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                const photo = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (photo) onFile(photo);
              }}
            />
          </label>
        )}
      </div>
      {/* Pasting a screenshot is a keyboard thing; hidden on touch screens. */}
      <div
        tabIndex={0}
        className="rounded-lg border border-dashed border-line px-4 py-3 text-mid focus:outline-none focus:ring-2 focus:ring-primary pointer-coarse:hidden"
      >
        Or copy a screenshot and paste it here (⌘V / Ctrl+V).
      </div>
      {pasteError && (
        <p role="alert" className="text-danger">
          {pasteError}
        </p>
      )}
      {hint && <span className="text-xs text-mid">{hint}</span>}
      {file && (
        <div className="mt-2 flex items-start gap-3">
          {isImage && (
            <div className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not an optimisable asset */}
              <img ref={thumb} alt="The screenshot you picked" className="block h-auto max-w-full max-h-48 w-auto rounded border border-line" />
            </div>
          )}
          <button type="button" className="link text-sm" onClick={() => onFile(null)} disabled={disabled}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
