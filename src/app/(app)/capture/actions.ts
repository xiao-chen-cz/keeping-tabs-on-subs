"use server";
import { redirect } from "next/navigation";
import type { CaptureFormState } from "@/components/capture-form";
import { requireUser } from "@/lib/dal/auth";
import {
  countRecentCaptures,
  downloadCaptureFile,
  loadDraftContext,
  saveCaptureWithProposal,
} from "@/lib/dal/captures";
import { getProfile } from "@/lib/dal/profile";
import { todayIn } from "@/lib/dates/plain-date";
import { parseCaptureForm } from "@/lib/extraction/capture-form";
import { extractCapture } from "@/lib/extraction/claude";
import { DAILY_CAPTURE_CAP, MAX_UPLOAD_BYTES, bytesMatchType, capReached, capturePath } from "@/lib/extraction/limits";
import type { CaptureContent } from "@/lib/extraction/prompt";
import { emptyDraft, extractionToDraft } from "@/lib/extraction/to-draft";

/**
 * One capture -> one extraction call -> one proposal, then the review screen (plan d16-20 Part B step 4).
 * Uploads are already in Storage (the browser put them there); this action only gets their id and type.
 */
export async function captureAction(_prev: CaptureFormState, formData: FormData): Promise<CaptureFormState> {
  const user = await requireUser();
  const values = Object.fromEntries(
    [...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const parsed = parseCaptureForm(values);
  if (!parsed.ok) return { error: parsed.error };
  const req = parsed.request;

  if (capReached(await countRecentCaptures())) {
    return { error: `You have added ${DAILY_CAPTURE_CAP} captures in the last 24 hours. Try again tomorrow, or enter it yourself.` };
  }

  let content: CaptureContent;
  let storagePath: string | null = null;
  if (req.kind === "upload") {
    storagePath = capturePath(user.id, req.captureId, req.mimeType);
    const file = await downloadCaptureFile(storagePath);
    if (!file) return { error: "The upload did not arrive. Try again." };
    if (file.size > MAX_UPLOAD_BYTES) return { error: "That file is larger than 10 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytesMatchType(bytes.subarray(0, 12), req.mimeType)) return { error: "That file is not a picture or PDF." };
    const base64 = Buffer.from(bytes).toString("base64");
    content =
      req.mimeType === "application/pdf" ? { kind: "pdf", base64 } : { kind: "image", mediaType: req.mimeType, base64 };
  } else {
    content = { kind: "text", text: req.text };
  }

  const [profile, ctx] = await Promise.all([getProfile(), loadDraftContext()]);
  const today = todayIn(profile.timeZone, new Date());
  const result = await extractCapture(content, today, ctx.categories);

  const proposalId = await saveCaptureWithProposal(
    {
      id: req.kind === "upload" ? req.captureId : undefined,
      input: req.kind,
      rawText: req.kind === "upload" ? null : req.text,
      storagePath,
      mimeType: req.kind === "upload" ? req.mimeType : "text/plain",
      extraction: result.ok ? { model: result.model, output: result.extraction } : null,
      extractionError: result.ok ? null : result.error,
    },
    result.ok ? extractionToDraft(result.extraction, ctx) : emptyDraft(),
  );
  redirect(`/review/${proposalId}`);
}
