import type { DueAlert } from "@/lib/domain/alerts";
import { dueSoon } from "@/lib/domain/alerts";
import type { ComputedSubscription, Currency, SubscriptionCore } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDay, relativeDays } from "./format";
import { MetaLine, RowShell } from "./renewal-row";

type Row<T extends SubscriptionCore> = ComputedSubscription<T>;

export interface DueSoonProps<T extends SubscriptionCore & { keptForCancelBy?: string | null }> {
  rows: Row<T>[];
  /** Alert offsets in days before cancel-by (user setting, default [3, 1, 0]). */
  offsets: number[];
  /** Omit for read-only rows. */
  hrefFor?: (row: Row<T>) => string;
}

const money = (cents: number) => (cents / 100).toFixed(2);

function amountPart(row: Row<SubscriptionCore>, alert: DueAlert) {
  const currency: Currency | null = row.input.currency;
  if (alert.priceRise && currency) {
    return (
      <span className="tabular-nums">
        <span>{money(alert.priceRise.fromCents)}</span>
        <span aria-label="rises to"> → </span>
        <span className="font-medium text-danger">{money(alert.priceRise.toCents)}</span> {currency}
      </span>
    );
  }
  const cents = row.computed.renewalAmountCents;
  return cents !== null && currency ? (
    <span className="tabular-nums">{formatMoney(cents, currency)}</span>
  ) : null;
}

/** "Due soon" section for the top of the list. Hidden when nothing is due. */
export function DueSoon<T extends SubscriptionCore & { keptForCancelBy?: string | null }>({
  rows,
  offsets,
  hrefFor,
}: DueSoonProps<T>) {
  const due = dueSoon(rows, offsets);
  if (due.length === 0) return null;
  return (
    <section aria-labelledby="h-due-soon" className="rounded-control border-l-4 border-accent bg-accent-light p-3">
      <div className="flex items-baseline gap-1.5 border-b border-line pb-1">
        <h2 id="h-due-soon" className="section-label">
          Due soon
        </h2>
        <span aria-hidden className="section-label">
          · {due.length}
        </span>
      </div>
      <ul>
        {due.map(({ row, alert }, i) => (
          <li key={`${row.input.name}-${i}`}>
            <RowShell href={hrefFor?.(row)}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-base font-semibold text-text">{row.input.name}</span>
                <span className="pill border-accent-dark/30 bg-accent-light text-accent-dark">
                  {relativeDays(alert.daysLeft)}
                </span>
              </div>
              <MetaLine
                parts={[
                  amountPart(row, alert),
                  <span key="c">
                    cancel by {formatDay(alert.cancelBy)}
                  </span>,
                ]}
              />
              {/* TODO(D21): Keep / Cancelled one-tap buttons once the server action exists. */}
            </RowShell>
          </li>
        ))}
      </ul>
    </section>
  );
}
