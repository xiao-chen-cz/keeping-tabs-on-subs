import "server-only";
import { requireUser } from "@/lib/dal/auth";
import { draftToProposalInsert } from "@/lib/dal/map-proposal";
import { listSubscriptions, loadLookups } from "@/lib/dal/subscriptions";
import type { CaptureInput, SubscriptionDraft } from "@/lib/domain/types";
import { MAX_UPLOAD_BYTES, bytesMatchType, capturePath, type UploadMimeType } from "@/lib/extraction/limits";
import type { DraftContext } from "@/lib/extraction/to-draft";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "captures";

/**
 * Captures sent to the model in the last 24 hours (plan B4): not seeded ones, and not cancellation proofs,
 * which are stored without an extraction or an extraction error.
 */
export async function countRecentCaptures(): Promise<number> {
  await requireUser();
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("captures")
    .select("id", { count: "exact", head: true })
    .neq("input", "seed")
    .or("extraction.not.is.null,extraction_error.not.is.null")
    .gte("received_at", since);
  if (error) throw new Error(`Could not count captures: ${error.message}`);
  return count ?? 0;
}

/** The user's own file in the captures bucket (storage RLS limits it to their folder). */
export async function downloadCaptureFile(path: string): Promise<Blob | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  return error ? null : data;
}

/** A short-lived link to show an uploaded capture on the review and detail pages. */
export async function captureFileUrl(path: string): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 10 * 60);
  return error ? null : data.signedUrl;
}

/** Signed links to the files of these captures (cancellation proofs in the history), by capture id. */
export async function captureFileLinks(ids: string[]): Promise<Record<string, { url: string; mimeType: string }>> {
  if (ids.length === 0) return {};
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("captures").select("id, storage_path, mime_type").in("id", ids);
  if (error) throw new Error(`Could not load captures: ${error.message}`);
  const links: Record<string, { url: string; mimeType: string }> = {};
  await Promise.all(
    data.map(async (c) => {
      if (!c.storage_path || !c.mime_type) return;
      const url = await captureFileUrl(c.storage_path);
      if (url) links[c.id] = { url, mimeType: c.mime_type };
    }),
  );
  return links;
}

/** What extraction needs to know about the user: never sent to the model except the category names. */
export async function loadDraftContext(): Promise<DraftContext> {
  await requireUser();
  const supabase = await createClient();
  const [lookups, subscriptions] = await Promise.all([loadLookups(supabase), listSubscriptions()]);
  return {
    categories: [...lookups.categories.values()].sort(),
    paymentMethods: [...lookups.paymentMethods.values()],
    subscriptions,
  };
}

export interface NewCapture {
  /** Set for uploads: the id the browser used in the storage path. */
  id?: string;
  input: Exclude<CaptureInput, "seed">;
  rawText: string | null;
  storagePath: string | null;
  mimeType: string | null;
  extraction: Json | null;
  extractionError: string | null;
}

/** Inserts the capture and its proposal (plan B7: one insert each, no update). Returns the proposal id. */
export async function saveCaptureWithProposal(capture: NewCapture, draft: SubscriptionDraft): Promise<string> {
  await requireUser();
  const supabase = await createClient();
  const lookups = await loadLookups(supabase);
  const idOf = (map: ReadonlyMap<string, string>, name: string | null) =>
    name === null ? null : ([...map].find(([, n]) => n === name)?.[0] ?? null);

  const cap = await supabase
    .from("captures")
    .insert({
      id: capture.id,
      input: capture.input,
      raw_text: capture.rawText,
      storage_path: capture.storagePath,
      mime_type: capture.mimeType,
      extraction: capture.extraction,
      extraction_error: capture.extractionError,
    })
    .select("id")
    .single();
  if (cap.error) throw new Error(`Could not save the capture: ${cap.error.message}`);

  const prop = await supabase
    .from("proposals")
    .insert(
      draftToProposalInsert(draft, cap.data.id, {
        categoryId: idOf(lookups.categories, draft.category),
        paymentMethodId: idOf(lookups.paymentMethods, draft.paymentMethod),
      }),
    )
    .select("id")
    .single();
  if (prop.error) throw new Error(`Could not save the proposal: ${prop.error.message}`);
  return prop.data.id;
}

/**
 * A file the browser uploaded as proof of a cancellation (D12): checked like any upload, then saved as a
 * capture with no extraction (it is never sent to the model). Returns the capture id, or an error to show.
 */
export async function saveProofCapture(
  userId: string,
  captureId: string,
  mimeType: UploadMimeType,
): Promise<{ ok: true; captureId: string } | { ok: false; error: string }> {
  const storagePath = capturePath(userId, captureId, mimeType);
  const file = await downloadCaptureFile(storagePath);
  if (!file) return { ok: false, error: "The screenshot did not arrive. Try again." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is larger than 10 MB." };
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!bytesMatchType(head, mimeType)) return { ok: false, error: "That file is not a picture or PDF." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("captures")
    .insert({ id: captureId, input: "upload", storage_path: storagePath, mime_type: mimeType });
  // Already saved by an earlier attempt that then failed validation: reuse it.
  if (error && error.code !== "23505") throw new Error(`Could not save the screenshot: ${error.message}`);
  return { ok: true, captureId };
}
