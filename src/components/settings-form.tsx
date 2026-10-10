"use client";
import { useActionState } from "react";
import type { AlertChannel } from "@/lib/domain/types";
import { OFFSET_CHOICES } from "@/lib/validation/alert-settings";

interface SettingsState {
  error: string | null;
}

const OFFSET_LABELS: Record<number, string> = { 7: "7 days before", 3: "3 days before", 1: "1 day before", 0: "On the day" };

/** Alert channel (D14) and reminder offsets (D10). In-app alerts cannot be switched off. */
export function SettingsForm({
  action,
  alertChannel,
  reminderOffsets,
  email,
}: {
  action: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
  alertChannel: AlertChannel;
  reminderOffsets: number[];
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-5 text-sm">
      <fieldset data-tour="alert-channel">
        <legend className="section-label">Where alerts go</legend>
        <label className="flex min-h-11 items-start gap-2 py-1">
          <input type="radio" name="alertChannel" value="app_email" defaultChecked={alertChannel === "app_email"} className="mt-1 size-4" />
          <span>
            <span className="font-medium text-text">In the app and by email</span>
            <span className="block text-mid">
              At most one email a day{email ? `, to ${email}` : ""}, only on days something is due.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-2 py-1">
          <input type="radio" name="alertChannel" value="app" defaultChecked={alertChannel === "app"} className="mt-1 size-4" />
          <span>
            <span className="font-medium text-text">In the app only</span>
            <span className="block text-mid">Alerts show under Due soon when you open the app.</span>
          </span>
        </label>
      </fieldset>
      <fieldset data-tour="reminder-days">
        <legend className="section-label">Remind me before the cancel-by</legend>
        <div className="mt-1 flex flex-col">
          {OFFSET_CHOICES.map((o) => (
            <label key={o} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="offset" value={o} defaultChecked={reminderOffsets.includes(o)} className="size-4" />
              <span>{OFFSET_LABELS[o]}</span>
            </label>
          ))}
        </div>
        <p data-tour="quiet-note" className="mt-1 text-xs text-mid">
          Subscriptions on Keep quietly get only the earliest of these, and only when they renew every 3 months or less often.
        </p>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
