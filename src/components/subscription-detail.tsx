import type { ReactNode } from "react";
import type { ComputedSubscription, Subscription } from "@/lib/domain/types";
import { BILLING_CYCLE_LABELS } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDayLong, relativeDays } from "./format";
import { Tag } from "./tag";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Item({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === false) return null;
  return (
    <div className="py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export function SubscriptionDetail({
  row,
  editHref,
}: {
  row: ComputedSubscription<Subscription>;
  editHref?: string;
}) {
  const { input: s, computed: c } = row;
  const money = (cents: number | null) =>
    cents !== null && s.currency !== null ? formatMoney(cents, s.currency) : null;
  const cancelled = s.status === "cancelled";

  return (
    <article className="mx-auto max-w-md px-4 py-6">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{s.name}</h1>
        {c.tags.needsUpdate && <Tag kind="needsUpdate" />}
        {c.tags.trial && <Tag kind="trial" />}
        {c.tags.ending && <Tag kind="ending" />}
      </header>
      {editHref && (
        <a
          href={editHref}
          className="my-2 inline-flex min-h-12 items-center rounded-full bg-indigo-600 px-6 font-medium text-white active:bg-indigo-700"
        >
          Edit
        </a>
      )}
      <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
        <Item label="Status">{cap(s.status)}</Item>
        <Item label="Vendor">{s.vendor}</Item>
        <Item label="Plan">{s.plan}</Item>
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
              className="text-indigo-700 underline dark:text-indigo-300"
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
    </article>
  );
}
