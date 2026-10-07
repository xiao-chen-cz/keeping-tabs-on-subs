"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** First picture or PDF in a paste, or null when the clipboard holds text (so pasting text still works). */
function pastedFile(data: DataTransfer | null): File | null {
  if (!data || data.types.includes("text/plain")) return null;
  const file = Array.from(data.files).find((f) => f.type.startsWith("image/") || f.type === "application/pdf");
  if (!file) return null;
  // Clipboard screenshots are all called "image.png"; give them a clearer name for the file field.
  return file.name === "image.png" ? new File([file], "pasted-screenshot.png", { type: file.type }) : file;
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
 * File picker plus a paste zone and a thumbnail. Controlled: the parent holds the file and uploads it on
 * submit (pair with usePastedFile so a paste anywhere on the page lands here).
 */
export function ScreenshotField({
  id,
  label,
  hint,
  file,
  onFile,
  disabled,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const thumb = useRef<HTMLImageElement>(null);
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
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="input py-2"
        disabled={disabled}
        onChange={(e) => onFile(e.currentTarget.files?.[0] ?? null)}
      />
      <div
        tabIndex={0}
        className="rounded-lg border border-dashed border-line px-4 py-3 text-mid focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Or copy a screenshot and paste it here (⌘V / Ctrl+V).
      </div>
      {hint && <span className="text-xs text-mid">{hint}</span>}
      {file && (
        <div className="mt-2 flex items-start gap-3">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL, not an optimisable asset
            <img ref={thumb} alt="The screenshot you picked" className="max-h-48 w-fit rounded border border-line" />
          )}
          <button type="button" className="link text-sm" onClick={() => onFile(null)} disabled={disabled}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
