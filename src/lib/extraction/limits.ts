// Capture limits (plan d16-20 B3, B4, B6). Shared by the browser upload and the server action.

/** Extraction calls per user per local day (B4). Failed calls count too. */
export const DAILY_CAPTURE_CAP = 30;

/** Bucket limit; the bucket enforces it as well. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Images are scaled down to this long edge in the browser before upload (B6). */
export const MAX_IMAGE_EDGE = 1568;

/** Longest typed or pasted capture we send. */
export const MAX_TEXT_CHARS = 20_000;

export const UPLOAD_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;

export type UploadMimeType = keyof typeof UPLOAD_TYPES;

export const isUploadMimeType = (t: string): t is UploadMimeType => Object.hasOwn(UPLOAD_TYPES, t);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** `<user_id>/<capture_id>.<ext>`, the only shape of path the action accepts. */
export function capturePath(userId: string, captureId: string, mimeType: UploadMimeType): string {
  return `${userId}/${captureId}.${UPLOAD_TYPES[mimeType]}`;
}

export function isValidCaptureId(id: string): boolean {
  return UUID.test(id);
}

export function capReached(capturesToday: number): boolean {
  return capturesToday >= DAILY_CAPTURE_CAP;
}

/** True when the file's first bytes match its declared type (a renamed file is refused before the model call). */
export function bytesMatchType(head: Uint8Array, mimeType: UploadMimeType): boolean {
  const starts = (...b: number[]) => b.every((v, i) => head[i] === v);
  switch (mimeType) {
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46);
  }
}

/** Size an image is drawn at before upload: the long edge at most MAX_IMAGE_EDGE, never enlarged (B6). */
export function scaledSize(width: number, height: number, max = MAX_IMAGE_EDGE): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const f = max / long;
  return { width: Math.round(width * f), height: Math.round(height * f) };
}
