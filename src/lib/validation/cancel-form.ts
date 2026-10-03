// Validation for the "Mark as cancelled" form (D12). Wraps validateCancellation and adds access until (D6).
import { isPlainDate } from "@/lib/dates/plain-date";
import { validateCancellation, type Cancellation } from "@/lib/domain/cancellation";
import type { PlainDate } from "@/lib/domain/types";

export const CANCEL_FORM_FIELDS = ["occurredOn", "channel", "reference", "note", "accessUntil"] as const;
export type CancelFormField = (typeof CANCEL_FORM_FIELDS)[number];
export type CancelFormValues = Record<CancelFormField, string>;

export interface CancelFormState {
  fieldErrors: Record<string, string[]>;
  values: Record<string, string> | null;
}

export const INITIAL_CANCEL_STATE: CancelFormState = { fieldErrors: {}, values: null };

export type CancelFormResult =
  | { ok: true; record: Cancellation; accessUntil: PlainDate | null }
  | { ok: false; fieldErrors: Record<string, string[]> };

export function parseCancelForm(values: Record<string, string | undefined>, today: PlainDate): CancelFormResult {
  const result = validateCancellation(
    {
      occurredOn: values.occurredOn ?? null,
      channel: values.channel ?? null,
      reference: values.reference ?? null,
      note: values.note ?? null,
    },
    today,
  );
  const fieldErrors: Record<string, string[]> = {};
  if (!result.ok) {
    for (const [k, v] of Object.entries(result.errors)) if (v) fieldErrors[k] = [v];
  }
  const accessRaw = values.accessUntil?.trim() ?? "";
  if (accessRaw !== "" && !isPlainDate(accessRaw)) fieldErrors.accessUntil = ["Enter a valid date"];
  if (!result.ok || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, record: result.value, accessUntil: accessRaw === "" ? null : accessRaw };
}
