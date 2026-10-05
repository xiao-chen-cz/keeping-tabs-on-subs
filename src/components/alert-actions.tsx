import Link from "next/link";
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
  offer,
}: {
  name: string;
  cancelBy: string | null;
  offer?: { accept: () => Promise<void>; decline: () => Promise<void> };
}) {
  return (
    <div role="status" className={noticeClass}>
      <p>
        Kept {name}
        {cancelBy ? ` (cancel-by ${formatDay(cancelBy)})` : ""}. No more reminders for this renewal.
      </p>
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
export function QuietNotice({ name }: { name: string }) {
  return (
    <p role="status" className={noticeClass}>
      {name} is now on Keep quietly. You&apos;ll still be alerted to captured price changes and promo endings.
    </p>
  );
}
