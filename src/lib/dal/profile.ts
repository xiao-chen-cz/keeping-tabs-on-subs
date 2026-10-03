import "server-only";
import { cache } from "react";
import { requireUser } from "@/lib/dal/auth";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  timeZone: string;
  reminderOffsets: number[];
  displayName: string | null;
}

const DEFAULT_PROFILE: Profile = {
  timeZone: "Europe/Berlin",
  reminderOffsets: [3, 1, 0],
  displayName: null,
};

/** The user's profile (time zone for "today", D8). Falls back to defaults if the row is missing. */
export const getProfile = cache(async (): Promise<Profile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("time_zone, reminder_offsets, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  if (!data) return DEFAULT_PROFILE;
  return {
    timeZone: data.time_zone,
    reminderOffsets: data.reminder_offsets,
    displayName: data.display_name,
  };
});
