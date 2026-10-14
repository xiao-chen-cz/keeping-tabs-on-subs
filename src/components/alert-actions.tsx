import type { ReactNode } from "react";
import Link from "next/link";
import { describeReminders } from "@/lib/domain/alerts";
import type { AlertMode, BillingCycle } from "@/lib/domain/types";
import { formatDay } from "./format";
import { CheckIcon, XIcon } from "./icons";

/**
 * Keep / Cancelled under a Due soon row (logic-spec §3.2). Keep is a plain form post (works without JS);
 * Cancelled opens the cancel sheet, because a cancellation needs its proof record (D12).
 */
export function AlertActions({ keep, cancelHref, name }: { keep: () => Promise<void>; cancelHref: string; name: string }) {
  return (
    <div className="flex gap-2 border-t border-line py-2">
      <form action={keep} className="flex-1">
        <button type="submit" className="btn-secondary min-h-10 w-full gap-1.5 px-3 text-sm text-green-ink" aria-label={`Keep ${name}`}>
          <CheckIcon />
          Keep
        </button>
      </form>
      <Link href={cancelHref} className="btn-secondary min-h-10 flex-1 gap-1.5 px-3 text-sm" aria-label={`${name} cancelled`}>
        <XIcon />
        Cancelled
      </Link>
    </div>
  );
}

const noticeClass = "mb-4 rounded-xl border border-green-ink/30 bg-green-light px-3 py-2 text-sm text-green-ink";

/** One line: ✓, the message, and an optional Undo / Open on the right. */
function NoticeLine({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <CheckIcon />
      <p className="min-w-0 flex-1">{children}</p>
      {end}
    </div>
  );
}

/** Shown on the list after Keep. With `offer`, asks once whether to stop routine reminders (D13, E44). */
export function KeptNotice({
  name,
  undo,
  offer,
}: {
  name: string;
  undo: () => Promise<void>;
  offer?: { accept: () => Promise<void>; decline: () => Promise<void> };
}) {
  return (
    <div role="status" className={noticeClass}>
      <NoticeLine end={<UndoButton action={undo} label={`Undo keep ${name}`} />}>
        Kept {name}
        <span className="text-green-ink/80"> · no reminders this renewal</span>
      </NoticeLine>
      {offer && (
        <div className="mt-2 border-t border-green-ink/20 pt-2">
          <p className="font-medium">Stop reminding you about {name}?</p>
          <p className="mt-0.5 text-xs">Price changes still alert you.</p>
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
    <div role="status" className={noticeClass}>
      <NoticeLine end={<UndoButton action={undo} label={`Undo keep quietly for ${name}`} />}>
        {name}: Keep quietly <span className="text-green-ink/80">· price changes still alert</span>
      </NoticeLine>
    </div>
  );
}

/** Shown on the list after switching a row back to Remind me (D13). */
export function RemindNotice({ name }: { name: string }) {
  return (
    <div role="status" className={noticeClass}>
      <NoticeLine>{name} will remind you before each cancel-by</NoticeLine>
    </div>
  );
}

/** Shown on the list after saving Settings. */
export function SettingsSavedNotice() {
  return (
    <div role="status" className={noticeClass}>
      <NoticeLine>Settings saved</NoticeLine>
    </div>
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
    <div role="status" className={noticeClass}>
      <NoticeLine
        end={
          <Link href={href} className="link -my-2 inline-flex min-h-10 shrink-0 items-center font-medium text-green-ink">
            Open
          </Link>
        }
      >
        Added {name}
        {nextRenewal && cancelBy && <span className="text-green-ink/80"> · cancel by {formatDay(cancelBy)}</span>}
      </NoticeLine>
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
      <p className="text-mid">Kept · no reminders before {formatDay(cancelBy)}</p>
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
          Price changes, promo endings and trials ending always alert. Got a price-change email? Add it under + New.
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
