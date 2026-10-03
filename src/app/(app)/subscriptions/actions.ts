"use server";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/dal/auth";
import { createSubscription, updateSubscription } from "@/lib/dal/subscriptions";
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
