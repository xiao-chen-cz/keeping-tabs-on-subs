// Settings form (D14, §3.2): alert channel and reminder offsets. Pure, unit-tested.
import { ALERT_CHANNELS, type AlertChannel } from "@/lib/domain/types";

/** The offsets a user can pick from, largest first. */
export const OFFSET_CHOICES = [7, 3, 1, 0] as const;

export type AlertSettingsResult =
  | { ok: true; alertChannel: AlertChannel; reminderOffsets: number[] }
  | { ok: false; error: string };

/** `channel` is one of ALERT_CHANNELS; `offsets` are the checked boxes (strings), at least one. */
export function parseAlertSettings(channel: unknown, offsets: unknown[]): AlertSettingsResult {
  if (typeof channel !== "string" || !(ALERT_CHANNELS as readonly string[]).includes(channel)) {
    return { ok: false, error: "Choose where alerts go." };
  }
  const picked = new Set(offsets.map((o) => Number(o)));
  const reminderOffsets = OFFSET_CHOICES.filter((o) => picked.has(o));
  if (reminderOffsets.length === 0) return { ok: false, error: "Choose at least one reminder day." };
  return { ok: true, alertChannel: channel as AlertChannel, reminderOffsets: [...reminderOffsets] };
}
