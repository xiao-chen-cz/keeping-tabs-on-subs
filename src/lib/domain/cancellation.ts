// Cancellation record (D12): what the user supplies when a subscription goes to Cancelled.
import { compare, isPlainDate } from "@/lib/dates/plain-date";
import { CANCEL_CHANNELS, type CancelChannel, type PlainDate } from "@/lib/domain/types";

export type { CancelChannel };

export const CANCEL_CHANNEL_LABELS: Record<CancelChannel, string> = {
  website_app: "Website / app",
  email: "Email",
  phone: "Phone",
  letter: "Letter",
  in_person: "In person",
  other: "Other",
};

export interface CancellationInput {
  occurredOn: string | null;
  channel: string | null;
  reference: string | null;
  note: string | null;
}

export interface Cancellation {
  occurredOn: PlainDate;
  channel: CancelChannel;
  reference: string | null;
  note: string | null;
}

export type CancellationResult =
  | { ok: true; value: Cancellation }
  | { ok: false; errors: Partial<Record<keyof CancellationInput, string>> };

export const REFERENCE_MAX_LENGTH = 100;

/** A 12-19 digit run once spaces and dashes are ignored looks like a card or account number. */
export function looksLikeCardNumber(s: string): boolean {
  return /\d{12,19}/.test(s.replace(/[\s-]/g, ""));
}

export function validateCancellation(input: CancellationInput, today: PlainDate): CancellationResult {
  const errors: Partial<Record<keyof CancellationInput, string>> = {};
  const occurredOn = input.occurredOn?.trim() ?? "";
  const channel = input.channel?.trim() ?? "";
  const reference = input.reference?.trim() ?? "";
  const note = input.note?.trim() ?? "";

  if (occurredOn === "") errors.occurredOn = "Enter the date you cancelled";
  else if (!isPlainDate(occurredOn)) errors.occurredOn = "Enter a valid date";
  else if (compare(occurredOn, today) > 0) errors.occurredOn = "The date cannot be in the future";

  if (channel === "") errors.channel = "Choose how you cancelled";
  else if (!(CANCEL_CHANNELS as readonly string[]).includes(channel)) errors.channel = "Choose how you cancelled";

  if (reference.length > REFERENCE_MAX_LENGTH) {
    errors.reference = `Use at most ${REFERENCE_MAX_LENGTH} characters`;
  } else if (looksLikeCardNumber(reference)) {
    errors.reference = "That looks like a card or account number. Enter a confirmation or ticket number instead";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      occurredOn,
      channel: channel as CancelChannel,
      reference: reference === "" ? null : reference,
      note: note === "" ? null : note,
    },
  };
}
