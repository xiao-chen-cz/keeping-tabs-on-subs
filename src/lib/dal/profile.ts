import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/dal/auth";
import type { AlertChannel } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  timeZone: string;
  reminderOffsets: number[];
  displayName: string | null;
  /** D14. */
  alertChannel: AlertChannel;
}

const DEFAULT_PROFILE: Profile = {
  timeZone: "Europe/Berlin",
  reminderOffsets: [3, 1, 0],
  displayName: null,
  alertChannel: "app_email",
};

/** The user's profile (time zone for "today", D8). Falls back to defaults if the row is missing. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("time_zone, reminder_offsets, display_name, alert_channel")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  if (!data) return DEFAULT_PROFILE;
  return {
    timeZone: data.time_zone,
    reminderOffsets: data.reminder_offsets,
    displayName: data.display_name,
    alertChannel: data.alert_channel,
  };
});

/** Settings page (D14). The profile row exists for every account (created with the account). */
export async function updateAlertSettings(alertChannel: AlertChannel, reminderOffsets: number[]): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ alert_channel: alertChannel, reminder_offsets: reminderOffsets })
    .eq("user_id", user.id);
  if (error) throw new Error(`Could not save settings: ${error.message}`);
}
