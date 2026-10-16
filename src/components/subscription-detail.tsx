import type { ReactNode } from "react";
import type { SubscriptionEvent } from "@/lib/dal/map-proposal";
import { CANCEL_CHANNEL_LABELS } from "@/lib/domain/cancellation";
import type { ComputedSubscription, PlainDate, Subscription } from "@/lib/domain/types";
import { BILLING_CYCLE_LABELS } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDay, formatDayLong, relativeDays } from "./format";
import { missingForSchedule } from "@/lib/domain/needs-update";
import { Tag } from "./tag";
import { CaptureView, type CaptureFile } from "./capture-view";
import { ChevronDownIcon } from "./icons";
import { CountdownTile, toneForDays } from "./renewal-row";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Item({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === false) return null;
  return (
    <div className="grid grid-cols-[2fr_3fr] gap-3 border-b border-line py-2 text-[15px]">
      <dt className="text-mid">{label}</dt>
      <dd className="min-w-0 break-words text-text">{children}</dd>
    </div>
  );
}

/** "Cancelled on 4 Oct 2026 via Website / app · ref ABC-123" / "Reopened on 5 Oct 2026" / "Kept on 1 Oct 2026 · cancel-by 4 Oct 2026". */
export function describeEvent(e: SubscriptionEvent): string {
  if (e.kind === "kept" || e.kind === "keep_undone") {
    const verb = e.kind === "kept" ? "Kept" : "Keep undone";
    return `${verb} on ${formatDayLong(e.occurredOn)}${e.cancelBy ? ` · cancel-by ${formatDayLong(e.cancelBy)}` : ""}`;
  }
  const verb = e.kind === "cancelled" ? "Cancelled" : "Reopened";
  let line = `${verb} on ${formatDayLong(e.occurredOn)}`;
  if (e.channel) line += ` via ${CANCEL_CHANNEL_LABELS[e.channel]}`;
  if (e.reference) line += ` · ref ${e.reference}`;
  return line;
}

const buttonClass = "btn-secondary";

const FILL = { calm: "bg-accent", soon: "bg-warn-line", urgent: "bg-danger", info: "bg-accent", warn: "bg-warn-line" } as const;

/** Today → cancel-by (coloured: time left to decide) → renewal (grey: the notice period). */
function Timeline({ cancelBy, daysToCancel, renewal, daysToRenewal }: { cancelBy: PlainDate; daysToCancel: number; renewal: PlainDate; daysToRenewal: number }) {
  const pct = Math.max(6, Math.min(94, (daysToCancel / daysToRenewal) * 100));
  return (
    <div className="mt-4">
      <p className="sr-only">
        Cancel by {formatDayLong(cancelBy)} ({relativeDays(daysToCancel)}). Renews {formatDayLong(renewal)} ({relativeDays(daysToRenewal)}).
      </p>
      <div aria-hidden>
        <div className="relative h-5 text-sm">
          <span
            className="absolute whitespace-nowrap font-semibold text-text"
            style={{ left: `${pct}%`, transform: pct > 50 ? "translateX(-100%)" : undefined }}
          >
            Cancel by {formatDay(cancelBy)}
          </span>
        </div>
        <div className="mt-1 flex h-2.5 gap-0.5">
          <span className={`rounded-l-full ${FILL[toneForDays(daysToCancel)]}`} style={{ width: `${pct}%` }} />
          <span className="flex-1 rounded-r-full bg-chip" />
        </div>
        <div className="mt-1 flex justify-between text-xs text-mid">
          <span>Today</span>
          <span>Renews {formatDay(renewal)}</span>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionDetail({
  row,
  editHref,
  completeHref,
  cancelHref,
  reopenAction,
  events,
  proofFiles = {},
  captureText,
  captureFile = null,
  reminders,
}: {
  row: ComputedSubscription<Subscription>;
  editHref?: string;
  /** Needs update rows link their banner here. */
  completeHref?: string;
  /** Link to the cancel form; shown for confirmed rows. */
  cancelHref?: string;
  /** Server action that reopens a cancelled row; shown for cancelled rows. */
  reopenAction?: () => Promise<void>;
  /** Event history, newest first. */
  events?: SubscriptionEvent[];
  /** Signed links to confirmation screenshots attached to events, by capture id. */
  proofFiles?: Record<string, CaptureFile>;
  /** Text of the original capture, when the entry came from one. Null/undefined: no section. */
  captureText?: string | null;
  /** The uploaded picture or PDF of the original capture (signed link). */
  captureFile?: CaptureFile | null;
  /** Reminder setting (D13), shown under the fields. Omit for read-only views. */
  reminders?: ReactNode;
}) {
  const { input: s, computed: c } = row;
  const money = (cents: number | null) =>
    cents !== null && s.currency !== null ? formatMoney(cents, s.currency) : null;
  const cancelled = s.status === "cancelled";

  return (
    <article>
      {c.tags.needsUpdate && completeHref && (
        <a
          href={completeHref}
          className="mb-3 block rounded-control border border-warn-line bg-warn-bg p-3 text-sm font-medium text-warn-ink"
        >
          Needs update: {missingForSchedule(s).length === 1 ? "1 question" : `${missingForSchedule(s).length} questions`}
        </a>
      )}
      <header className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="font-heading text-2xl font-semibold text-primary-ink">{s.name}</h1>
        {c.tags.needsUpdate && <Tag kind="needsUpdate" />}
        {c.tags.trial && <Tag kind="trial" />}
        {c.tags.ending && <Tag kind="ending" />}
        {!cancelled && s.alertMode === "quiet" && <Tag kind="quiet" />}
      </header>
      <section aria-label="Summary" className="mb-3 rounded-xl border border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {money(s.amountCents) && (
              <p className="font-heading text-3xl font-semibold text-text tabular-nums">{money(s.amountCents)}</p>
            )}
            <p className="text-sm text-mid">
              {cancelled ? "Cancelled" : s.billingCycle ? BILLING_CYCLE_LABELS[s.billingCycle] : null}
            </p>
            {!cancelled && c.priceRises && c.renewalAmountCents !== null && (
              <p className="mt-1 text-sm font-medium text-danger">
                ↑ {money(c.renewalAmountCents)}
                {c.nextRenewal && ` from ${formatDay(c.nextRenewal)}`}
              </p>
            )}
          </div>
          {!cancelled && !c.tags.needsUpdate && c.daysUntilCancelBy !== null && c.daysUntilRenewal !== 0 &&
            (c.daysUntilCancelBy < 0 ? (
              <CountdownTile word="Late" tone="urgent" />
            ) : c.daysUntilCancelBy === 0 ? (
              <CountdownTile word="Today" tone="urgent" />
            ) : (
              <CountdownTile days={c.daysUntilCancelBy} tone={toneForDays(c.daysUntilCancelBy)} />
            ))}
        </div>
        {!cancelled && c.nextRenewal && c.daysUntilRenewal !== null && c.cancelBy && c.daysUntilCancelBy !== null && (
          c.daysUntilRenewal === 0 ? (
            <p className="mt-3 text-sm text-text">
              {c.tags.trial ? "Trial ends today" : "Charged today"}
              {c.followingRenewal && <span className="text-mid"> · next {formatDay(c.followingRenewal)}</span>}
            </p>
          ) : c.daysUntilCancelBy < 0 ? (
            <p className="mt-3 text-sm">
              <span className="font-medium text-danger">Too late to cancel</span>
              <span className="text-mid"> · renews {formatDayLong(c.nextRenewal)}</span>
            </p>
          ) : (
            <Timeline cancelBy={c.cancelBy} daysToCancel={c.daysUntilCancelBy} renewal={c.nextRenewal} daysToRenewal={c.daysUntilRenewal} />
          )
        )}
        {cancelled && s.accessUntil && (
          <p className="mt-2 text-sm text-mid">
            Access until <span className="font-medium text-text">{formatDayLong(s.accessUntil)}</span>
          </p>
        )}
      </section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {editHref && (
          <a href={editHref} className="btn-primary">
            Edit
          </a>
        )}
        {cancelHref && !cancelled && (
          <a href={cancelHref} className={buttonClass}>
            Mark as cancelled
          </a>
        )}
        {reopenAction && cancelled && (
          <form action={reopenAction}>
            <button type="submit" className={buttonClass}>
              Reopen
            </button>
          </form>
        )}
        {s.cancelUrl && !cancelled && (
          <a href={s.cancelUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClass} gap-1`}>
            Cancel page <span aria-hidden>↗</span>
          </a>
        )}
      </div>
      <details className="group rounded-control border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          More details
          <span className="text-mid transition-transform group-open:rotate-180">
            <ChevronDownIcon />
          </span>
        </summary>
        <dl className="border-t border-line px-3">
          <Item label="Vendor">{s.vendor}</Item>
          <Item label="Plan">{s.plan}</Item>
          <Item label="Account">{s.accountLabel}</Item>
          <Item label="Next renewal">
            {c.nextRenewal && c.daysUntilRenewal !== null
              ? `${formatDayLong(c.nextRenewal)} (${relativeDays(c.daysUntilRenewal)})`
              : null}
          </Item>
          <Item label="Notice">
            {!cancelled && `${c.noticeDays} days ${c.noticeIsDefault ? "(default)" : "(custom)"}`}
          </Item>
          {/* A cancelled row has no next charge; only a past charge is shown. */}
          <Item label={c.anchorInFuture ? "Next charge" : "Last charge"}>
            {s.lastRenewalDate && !(cancelled && c.anchorInFuture) && formatDayLong(s.lastRenewalDate)}
          </Item>
          <Item label="Trial ends">{s.trialEnds && formatDayLong(s.trialEnds)}</Item>
          <Item label="Regular price">{money(s.regularPriceCents)}</Item>
          <Item label="Promo ends">{s.promoEnds && formatDayLong(s.promoEnds)}</Item>
          <Item label="Cancel link">
            {s.cancelUrl && cancelled && (
              <a href={s.cancelUrl} target="_blank" rel="noopener noreferrer" className="link">
                {s.cancelUrl}
              </a>
            )}
          </Item>
          <Item label="Payment method">{s.paymentMethod}</Item>
          <Item label="Category">{s.category}</Item>
          <Item label="Scope">{s.scope && cap(s.scope)}</Item>
          <Item label="Source">{cap(s.source)}</Item>
          <Item label="Notes">{s.notes}</Item>
        </dl>
      </details>
      {!cancelled && reminders && <div className="mt-4">{reminders}</div>}
      {events && events.length > 0 && (
        <section className="mt-5" aria-labelledby="history-heading">
          <h2 id="history-heading" className="section-label">
            History
          </h2>
          <ul className="mt-1 flex flex-col">
            {events.map((e) => (
              <li key={e.id} className="border-b border-line py-2 text-sm">
                {describeEvent(e)}
                {e.note && <span className="block text-mid">{e.note}</span>}
                {e.captureId && proofFiles[e.captureId] && (
                  <a href={proofFiles[e.captureId].url} target="_blank" rel="noopener noreferrer" className="link block w-fit">
                    {proofFiles[e.captureId].mimeType === "application/pdf" ? "Confirmation (PDF)" : "Confirmation screenshot"}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {(captureText != null || captureFile !== null) && (
        <details className="mt-5 rounded-control border border-line p-3 text-sm">
          <summary className="min-h-8 cursor-pointer font-medium">Original capture</summary>
          <CaptureView text={captureText ?? null} file={captureFile} />
        </details>
      )}
    </article>
  );
}
