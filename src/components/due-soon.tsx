import type { DueAlert } from "@/lib/domain/alerts";
import { dueSoon } from "@/lib/domain/alerts";
import type { ComputedSubscription, Currency, SubscriptionCore } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDay, relativeDays } from "./format";
import { RowShell } from "./renewal-row";

type Row<T extends SubscriptionCore> = ComputedSubscription<T>;

export interface DueSoonProps<T extends SubscriptionCore & { keptForCancelBy?: string | null }> {
  rows: Row<T>[];
  /** Alert offsets in days before cancel-by (user setting, default [3, 1, 0]). */
  offsets: number[];
  /** Omit for read-only rows. */
  hrefFor?: (row: Row<T>) => string;
}

const money = (cents: number) => (cents / 100).toFixed(2);

function Amount({ row, alert }: { row: Row<SubscriptionCore>; alert: DueAlert }) {
  const currency: Currency | null = row.input.currency;
  if (alert.priceRise && currency) {
    return (
      <p className="text-sm font-medium tabular-nums">
        <span className="text-neutral-500 dark:text-neutral-400">{money(alert.priceRise.fromCents)}</span>
        <span aria-label="rises to"> → </span>
        <span className="text-red-700 dark:text-red-400">{money(alert.priceRise.toCents)}</span> {currency}
      </p>
    );
  }
  const cents = row.computed.renewalAmountCents;
  return cents !== null && currency ? (
    <p className="text-sm font-medium tabular-nums">
      {formatMoney(cents, currency)}
    </p>
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
    <section aria-labelledby="h-due-soon">
      <h2
        id="h-due-soon"
        className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
      >
        Due soon
      </h2>
      <ul className="space-y-2">
        {due.map(({ row, alert }, i) => (
          <li key={`${row.input.name}-${i}`}>
            <RowShell href={hrefFor?.(row)}>
              <span className="font-semibold">{row.input.name}</span>
              <Amount row={row} alert={alert} />
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                cancel by {formatDay(alert.cancelBy)} ({relativeDays(alert.daysLeft)})
              </p>
              {/* TODO(D21): Keep / Cancelled one-tap buttons once the server action exists. */}
            </RowShell>
          </li>
        ))}
      </ul>
    </section>
  );
}
