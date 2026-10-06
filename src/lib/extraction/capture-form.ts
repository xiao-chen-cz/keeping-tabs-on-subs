// The /capture form, validated by code before anything is sent to the model. Pure: unit-testable.
import { MAX_TEXT_CHARS, isUploadMimeType, isValidCaptureId, type UploadMimeType } from "./limits";

export type CaptureRequest =
  | { kind: "text" | "paste"; text: string }
  | { kind: "upload"; captureId: string; mimeType: UploadMimeType };

export type CaptureFormResult = { ok: true; request: CaptureRequest } | { ok: false; error: string };

export function parseCaptureForm(values: Record<string, string | undefined>): CaptureFormResult {
  const kind = values.kind;
  if (kind === "text" || kind === "paste") {
    const text = (values.text ?? "").trim();
    if (text === "") {
      return { ok: false, error: kind === "text" ? "Describe the subscription first." : "Paste the email text first." };
    }
    if (text.length > MAX_TEXT_CHARS) return { ok: false, error: "That is too long. Paste only the part about the charge." };
    return { ok: true, request: { kind, text } };
  }
  if (kind === "upload") {
    const captureId = values.captureId ?? "";
    const mimeType = values.mimeType ?? "";
    if (!isValidCaptureId(captureId) || !isUploadMimeType(mimeType)) {
      return { ok: false, error: "Choose a screenshot, photo or PDF first." };
    }
    return { ok: true, request: { kind, captureId, mimeType } };
  }
  return { ok: false, error: "Choose how to add the subscription." };
}
