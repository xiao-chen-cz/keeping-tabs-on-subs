"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal/auth";
import { updateAlertSettings } from "@/lib/dal/profile";
import { parseAlertSettings } from "@/lib/validation/alert-settings";

export interface SettingsState {
  error: string | null;
}

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireUser();
  const parsed = parseAlertSettings(formData.get("alertChannel"), formData.getAll("offset"));
  if (!parsed.ok) return { error: parsed.error };
  await updateAlertSettings(parsed.alertChannel, parsed.reminderOffsets);
  redirect("/settings?saved=1");
}
