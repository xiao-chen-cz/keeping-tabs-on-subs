import Link from "next/link";
import { describeReminders } from "@/lib/domain/alerts";
import type { AlertMode, BillingCycle } from "@/lib/domain/types";
import { formatDay } from "./format";

/**
 * Keep / Cancelled under a Due soon row (logic-spec §3.2). Keep is a plain form post (works without JS);
 * Cancelled opens the cancel sheet, because a cancellation needs its proof record (D12).
 */
export function AlertActions({ keep, cancelHref, name }: { keep: () => Promise<void>; cancelHref: string; name: string }) {
  return (
    <div className="flex gap-2 pb-2">
      <form action={keep}>
        <button type="submit" className="btn-secondary min-h-10 px-4 text-sm" aria-label={`Keep ${name}`}>
          Keep
        </button>
      </form>
      <Link href={cancelHref} className="btn-secondary min-h-10 px-4 text-sm" aria-label={`${name} cancelled`}>
        Cancelled
      </Link>
    </div>
  );
}

const noticeClass = "mb-4 rounded-control border border-green-ink/30 bg-green-light p-3 text-sm text-green-ink";

/** Shown on the list after Keep. With `offer`, asks once whether to stop routine reminders (D13, E44). */
export function KeptNotice({
  name,
  cancelBy,
  undo,
  offer,
}: {
  name: string;
  cancelBy: string | null;
  undo: () => Promise<void>;
  offer?: { accept: () => Promise<void>; decline: () => Promise<void> };
}) {
  return (
    <div role="status" className={noticeClass}>
      <div className="flex items-start justify-between gap-3">
        <p>
          Kept {name}
          {cancelBy ? ` (cancel-by ${formatDay(cancelBy)})` : ""}. No more reminders for this renewal.
        </p>
        <UndoButton action={undo} label={`Undo keep ${name}`} />
      </div>
      {offer && (
        <div className="mt-2 border-t border-green-ink/20 pt-2">
          <p className="font-medium">Stop reminding you about {name}?</p>
          <p className="mt-0.5">You&apos;ll still be alerted to captured price changes and promo endings.</p>
          <div className="mt-2 flex gap-2">
            <form action={offer.accept}>
              <button type="submit" className="btn-primary min-h-10 px-4 text-sm">
                Keep quietly
              </button>
            </form>
            <form action={offer.decline}>
              <button type="submit" className="btn-secondary min-h-10 px-4 text-sm">
                Keep reminding me
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Shown on the list after switching a row to Keep quietly. */
export function QuietNotice({ name, undo }: { name: string; undo: () => Promise<void> }) {
  return (
    <div role="status" className={`${noticeClass} flex items-start justify-between gap-3`}>
      <p>
        {name} is now on Keep quietly. You&apos;ll still be alerted to captured price changes and promo endings.
      </p>
      <UndoButton action={undo} label={`Undo keep quietly for ${name}`} />
    </div>
  );
}

/** Shown on the list after switching a row back to Remind me (D13). */
export function RemindNotice({ name }: { name: string }) {
  return (
    <p role="status" className={noticeClass}>
      Saved. {name} will remind you before each cancel-by.
    </p>
  );
}

/** Shown on the list after approving a proposal: the entry is in the list now. */
export function AddedNotice({
  name,
  nextRenewal,
  cancelBy,
  href,
}: {
  name: string;
  nextRenewal: string | null;
  cancelBy: string | null;
  href: string;
}) {
  return (
    <div role="status" className={`${noticeClass} flex items-start justify-between gap-3`}>
      <p>
        {name} is now in your list.
        {nextRenewal ? ` Renews ${formatDay(nextRenewal)}` : ""}
        {nextRenewal && cancelBy ? `, cancel by ${formatDay(cancelBy)}.` : nextRenewal ? "." : ""}
      </p>
      <Link href={href} className="link -my-2 inline-flex min-h-10 shrink-0 items-center font-medium text-green-ink">
        Open
      </Link>
    </div>
  );
}

function UndoButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form action={action} className="shrink-0">
      <button type="submit" className="link -my-2 min-h-10 font-medium text-green-ink" aria-label={label}>
        Undo
      </button>
    </form>
  );
}

/** Detail page: the current renewal is kept. Reminders can be switched back on until the cancel-by. */
export function KeptForRenewal({ cancelBy, remindAgain }: { cancelBy: string; remindAgain: () => Promise<void> }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-control border border-line bg-surface p-3 text-sm">
      <p className="text-mid">Kept for this renewal: no reminders before the cancel-by {formatDay(cancelBy)}.</p>
      <form action={remindAgain} className="shrink-0">
        <button type="submit" className="btn-secondary min-h-10 px-3 text-sm">
          Remind me again
        </button>
      </form>
    </div>
  );
}

/**
 * Reminder setting on the detail page (D13). A plain form with two radios, so it works without JS.
 * The help text says what the app can and cannot see (logic-spec §3.2).
 */
export function RemindersForm({
  mode,
  cycle,
  offsets,
  action,
}: {
  mode: AlertMode;
  cycle: BillingCycle | null;
  offsets: number[];
  action: (formData: FormData) => Promise<void>;
}) {
  const option = (value: AlertMode, label: string) => (
    <label className="flex min-h-11 items-start gap-2 py-1">
      <input type="radio" name="alertMode" value={value} defaultChecked={mode === value} className="mt-1 size-4" />
      <span>
        <span className="font-medium text-text">{label}</span>
        <span className="block text-mid">{describeReminders(value, cycle, offsets)}</span>
      </span>
    </label>
  );
  return (
    <section className="mt-5" aria-labelledby="reminders-heading">
      <h2 id="reminders-heading" className="section-label">
        Reminders
      </h2>
      <form action={action} className="mt-1 flex flex-col gap-1 text-sm">
        {option("remind", "Remind me")}
        {option("quiet", "Keep quietly")}
        <p className="text-xs text-mid">
          Keep quietly still alerts you to price changes and promo endings the app knows about, and to trials ending. The app
          only sees prices you give it, so paste price-change emails under Add subscription.
        </p>
        <div className="pt-1">
          <button type="submit" className="btn-secondary min-h-10 px-4 text-sm">
            Save reminders
          </button>
        </div>
      </form>
    </section>
  );
}
