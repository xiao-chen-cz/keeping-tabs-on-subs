"use server";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/dal/auth";
import { saveProofCapture } from "@/lib/dal/captures";
import { setStatus } from "@/lib/dal/events";
import { getProfile } from "@/lib/dal/profile";
import { createSubscription, updateSubscription } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { isUploadMimeType, isValidCaptureId } from "@/lib/extraction/limits";
import { parseCancelForm, type CancelFormState } from "@/lib/validation/cancel-form";
import { parseSubscriptionForm, type FormMode } from "@/lib/validation/subscription-form";
import type { SubscriptionFormState } from "@/components/subscription-form-values";

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

async function parse(formData: FormData, mode: FormMode) {
  const values = readValues(formData);
  const parsed = parseSubscriptionForm(values, mode);
  return { values, parsed };
}

export async function createSubscriptionAction(
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  await requireUser();
  const { values, parsed } = await parse(formData, "create");
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };
  const id = await createSubscription(parsed.data);
  redirect(`/subscriptions/${id}`);
}

/** Bind the id first: `updateSubscriptionAction.bind(null, id)`. */
export async function updateSubscriptionAction(
  id: string,
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  await requireUser();
  const { values, parsed } = await parse(formData, "edit");
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };
  const updated = await updateSubscription(id, parsed.data);
  if (updated === null) notFound();
  redirect(`/subscriptions/${updated}`);
}

/** Bind the id first. Records the cancellation (event) and the status change in one transaction (D12). */
export async function cancelSubscriptionAction(
  id: string,
  _prev: CancelFormState,
  formData: FormData,
): Promise<CancelFormState> {
  const user = await requireUser();
  const values = readValues(formData);
  const profile = await getProfile();
  const parsed = parseCancelForm(values, todayIn(profile.timeZone, new Date()));
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  // Optional confirmation screenshot, already in Storage (the browser put it there).
  let captureId: string | null = null;
  if (values.captureId) {
    const mimeType = values.mimeType ?? "";
    if (!isValidCaptureId(values.captureId) || !isUploadMimeType(mimeType)) {
      return { fieldErrors: { captureId: ["The screenshot could not be attached. Try again."] }, values };
    }
    const proof = await saveProofCapture(user.id, values.captureId, mimeType);
    if (!proof.ok) return { fieldErrors: { captureId: [proof.error] }, values };
    captureId = proof.captureId;
  }

  await setStatus({
    subscriptionId: id,
    status: "cancelled",
    record: parsed.record,
    accessUntil: parsed.accessUntil,
    captureId,
  });
  redirect(`/subscriptions/${id}`);
}

/** Bind the id first. Sets the status back to confirmed and records a "reopened" event. */
export async function reopenSubscriptionAction(id: string): Promise<void> {
  await requireUser();
  await setStatus({ subscriptionId: id, status: "confirmed" });
  redirect(`/subscriptions/${id}`);
}
