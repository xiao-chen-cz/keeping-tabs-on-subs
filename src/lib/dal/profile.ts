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
  /** First-sign-in tour finished or skipped. */
  tourDone: boolean;
}

const DEFAULT_PROFILE: Profile = {
  timeZone: "Europe/Berlin",
  reminderOffsets: [3, 1, 0],
  displayName: null,
  alertChannel: "app_email",
  // No profile row means nowhere to record the tour, so do not show it.
  tourDone: true,
};

/** The user's profile (time zone for "today", D8). Falls back to defaults if the row is missing. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("time_zone, reminder_offsets, display_name, alert_channel, tour_done_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  if (!data) return DEFAULT_PROFILE;
  return {
    timeZone: data.time_zone,
    reminderOffsets: data.reminder_offsets,
    displayName: data.display_name,
    alertChannel: data.alert_channel,
    tourDone: data.tour_done_at !== null,
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

/** Records that the user has seen the tour (started, skipped or finished). Replays keep the first time. */
export async function markTourDone(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tour_done_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("tour_done_at", null);
  if (error) throw new Error(`Could not save the tour: ${error.message}`);
}
