import type { ReactNode } from "react";
import type { SubscriptionEvent } from "@/lib/dal/map-proposal";
import { CANCEL_CHANNEL_LABELS } from "@/lib/domain/cancellation";
import type { ComputedSubscription, Subscription } from "@/lib/domain/types";
import { BILLING_CYCLE_LABELS } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDayLong, relativeDays } from "./format";
import { missingForSchedule } from "@/lib/domain/needs-update";
import { Tag } from "./tag";

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

/** "Cancelled on 4 Oct 2026 via Website / app · ref ABC-123" / "Reopened on 5 Oct 2026". */
export function describeEvent(e: SubscriptionEvent): string {
  const verb = e.kind === "cancelled" ? "Cancelled" : "Reopened";
  let line = `${verb} on ${formatDayLong(e.occurredOn)}`;
  if (e.channel) line += ` via ${CANCEL_CHANNEL_LABELS[e.channel]}`;
  if (e.reference) line += ` · ref ${e.reference}`;
  return line;
}

const buttonClass = "btn-secondary";

export function SubscriptionDetail({
  row,
  editHref,
  completeHref,
  cancelHref,
  reopenAction,
  events,
  captureText,
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
  /** Text of the original capture, when the entry came from one. Null/undefined: no section. */
  captureText?: string | null;
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
      </header>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {editHref && (
          <a
            href={editHref}
            className="btn-primary"
          >
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
      </div>
      <dl className="border-t border-line">
        <Item label="Status">{cap(s.status)}</Item>
        <Item label="Vendor">{s.vendor}</Item>
        <Item label="Plan">{s.plan}</Item>
        <Item label="Account">{s.accountLabel}</Item>
        <Item label="Amount">{money(s.amountCents)}</Item>
        <Item label="Renewal amount">
          {!cancelled && c.renewalAmountCents !== null && c.renewalAmountCents !== s.amountCents
            ? money(c.renewalAmountCents)
            : null}
        </Item>
        <Item label="Billing cycle">{s.billingCycle && BILLING_CYCLE_LABELS[s.billingCycle]}</Item>
        <Item label="Next renewal">
          {c.nextRenewal && c.daysUntilRenewal !== null
            ? `${formatDayLong(c.nextRenewal)} (${relativeDays(c.daysUntilRenewal)})`
            : null}
        </Item>
        <Item label="Cancel by">
          {c.cancelBy && c.daysUntilCancelBy !== null
            ? c.daysUntilCancelBy < 0
              ? `${formatDayLong(c.cancelBy)} (deadline passed)`
              : `${formatDayLong(c.cancelBy)} (${relativeDays(c.daysUntilCancelBy)})`
            : null}
        </Item>
        <Item label="Notice">
          {!cancelled && `${c.noticeDays} days ${c.noticeIsDefault ? "(default)" : "(custom)"}`}
        </Item>
        <Item label={c.anchorInFuture ? "Next charge" : "Last charge"}>{s.lastRenewalDate && formatDayLong(s.lastRenewalDate)}</Item>
        <Item label="Trial ends">{s.trialEnds && formatDayLong(s.trialEnds)}</Item>
        <Item label="Regular price">{money(s.regularPriceCents)}</Item>
        <Item label="Promo ends">{s.promoEnds && formatDayLong(s.promoEnds)}</Item>
        <Item label="Access until">{cancelled && s.accessUntil && formatDayLong(s.accessUntil)}</Item>
        <Item label="Cancel link">
          {s.cancelUrl && (
            <a
              href={s.cancelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              {s.cancelUrl}
            </a>
          )}
        </Item>
        <Item label="Payment method">{s.paymentMethod}</Item>
        <Item label="Category">{s.category}</Item>
        <Item label="Scope">{s.scope && cap(s.scope)}</Item>
        <Item label="Confidence">{s.confidence && cap(s.confidence)}</Item>
        <Item label="Source">{cap(s.source)}</Item>
        <Item label="Notes">{s.notes}</Item>
      </dl>
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
              </li>
            ))}
          </ul>
        </section>
      )}
      {captureText != null && (
        <details className="mt-5 rounded-control border border-line p-3 text-sm">
          <summary className="min-h-8 cursor-pointer font-medium">Original capture</summary>
          <p className="mt-2 whitespace-pre-wrap break-words">{captureText}</p>
        </details>
      )}
    </article>
  );
}
