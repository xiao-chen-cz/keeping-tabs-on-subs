"use client";
// Browser side of a file capture: shrink pictures, then put the file in the user's Storage folder.
// Shared by the capture form and the cancel form (confirmation screenshot, D12).
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_TYPES,
  isUploadMimeType,
  scaledSize,
  type UploadMimeType,
} from "@/lib/extraction/limits";
import { createBrowserSupabase } from "@/lib/supabase/browser";

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

export type UploadResult = { ok: true; captureId: string; mimeType: UploadMimeType } | { ok: false; error: string };

/** Uploads to `<userId>/<captureId>.<ext>`. The server action then checks the file and saves the capture row. */
export async function uploadCaptureFile(file: File, userId: string): Promise<UploadResult> {
  try {
    let blob: Blob = file;
    let mimeType: UploadMimeType;
    if (file.type === "application/pdf") {
      mimeType = "application/pdf";
    } else if (file.type.startsWith("image/")) {
      ({ blob, mimeType } = await prepareImage(file));
    } else {
      return { ok: false, error: "That file is not a picture or PDF." };
    }
    if (blob.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is larger than 10 MB." };
    const captureId = crypto.randomUUID();
    const path = `${userId}/${captureId}.${UPLOAD_TYPES[mimeType]}`;
    const { error } = await createBrowserSupabase()
      .storage.from("captures")
      .upload(path, blob, { contentType: mimeType, upsert: false });
    if (error) return { ok: false, error: "The upload failed. Check your connection and try again." };
    return { ok: true, captureId, mimeType };
  } catch {
    return { ok: false, error: "That picture could not be opened. Try a screenshot instead." };
  }
}
