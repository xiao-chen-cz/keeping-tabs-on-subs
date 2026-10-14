import type { ReactNode } from "react";
import { dueSoon } from "@/lib/domain/alerts";
import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import { formatDay, relativeDays } from "./format";
import { accountPart, AmountBlock, CountdownTile, MetaLine, RowLayout, RowShell, toneForDays } from "./renewal-row";
import { Tag } from "./tag";

type Row<T extends SubscriptionCore> = ComputedSubscription<T>;

export interface DueSoonProps<T extends SubscriptionCore & { keptForCancelBy?: string | null; accountLabel?: string | null; alertMode?: "remind" | "quiet" }> {
  rows: Row<T>[];
  /** Alert offsets in days before cancel-by (user setting, default [3, 1, 0]). */
  offsets: number[];
  /** Omit for read-only rows. */
  hrefFor?: (row: Row<T>) => string;
  /** Names shared by several rows (duplicateNames): their account label is shown. */
  duplicates?: ReadonlySet<string>;
  /** Keep / Cancelled controls under each row, outside the row link. Omit for read-only rows. */
  actionsFor?: (row: Row<T>, cancelBy: string) => ReactNode;
}

/** "Due soon" section for the top of the list. Hidden when nothing is due. */
export function DueSoon<T extends SubscriptionCore & { keptForCancelBy?: string | null; accountLabel?: string | null; alertMode?: "remind" | "quiet" }>({
  rows,
  offsets,
  hrefFor,
  duplicates,
  actionsFor,
}: DueSoonProps<T>) {
  const due = dueSoon(rows, offsets);
  if (due.length === 0) return null;
  return (
    <section aria-labelledby="h-due-soon" data-tour="due-soon" className="rounded-xl bg-accent-light p-3">
      <h2 id="h-due-soon" className="section-label flex items-baseline gap-1.5 pb-2">
        Due soon <span aria-hidden>· {due.length}</span>
      </h2>
      <ul className="space-y-2">
        {due.map(({ row, alert }, i) => (
          <li key={`${row.input.name}-${i}`} className="rounded-xl border border-line bg-surface px-3 shadow-sm">
            <RowShell href={hrefFor?.(row)} className="block py-3">
              <RowLayout
                tile={
                  alert.daysLeft === 0 ? (
                    <CountdownTile word="Today" tone="urgent" />
                  ) : (
                    <CountdownTile days={alert.daysLeft} tone={toneForDays(alert.daysLeft)} />
                  )
                }
                name={row.input.name}
                tags={row.input.alertMode === "quiet" && <Tag kind="quiet" />}
                sub={
                  <MetaLine
                    parts={[
                      <span key="c">
                        Cancel by {formatDay(alert.cancelBy)}
                        <span className="sr-only"> ({relativeDays(alert.daysLeft)})</span>
                      </span>,
                      accountPart(duplicates, row.input),
                    ]}
                  />
                }
                amount={
                  <AmountBlock
                    cents={alert.priceRise ? alert.priceRise.toCents : row.computed.renewalAmountCents}
                    fromCents={alert.priceRise?.fromCents}
                    currency={row.input.currency}
                  />
                }
              />
            </RowShell>
            {actionsFor?.(row, alert.cancelBy)}
          </li>
        ))}
      </ul>
    </section>
  );
}
