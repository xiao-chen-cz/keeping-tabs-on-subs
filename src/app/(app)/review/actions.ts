"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal/auth";
import { approveProposal, detachProposal, rejectProposal } from "@/lib/dal/proposals";
import { parseSubscriptionForm } from "@/lib/validation/subscription-form";
import type { SubscriptionFormState } from "@/components/subscription-form-values";

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

/** Bind the proposal id first. The server validates again; the UI gate is only a convenience. */
export async function approveProposalAction(
  id: string,
  _prev: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  await requireUser();
  const values = readValues(formData);
  const parsed = parseSubscriptionForm(values, "create");
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };
  const subscriptionId = await approveProposal(id, parsed.data);
  redirect(`/?added=${subscriptionId}`);
}

export async function rejectProposalAction(id: string): Promise<void> {
  await requireUser();
  await rejectProposal(id);
  redirect("/review");
}

export async function detachProposalAction(id: string): Promise<void> {
  await requireUser();
  await detachProposal(id);
  redirect(`/review/${id}`);
}
