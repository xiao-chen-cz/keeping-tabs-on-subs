import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import type { CurrencyTotals } from "@/lib/domain/totals";
import { dueSoon } from "@/lib/domain/alerts";
import { DueSoon } from "./due-soon";
import { EndingRow } from "./ending-row";
import { RenewalRow } from "./renewal-row";
import { TotalsCard } from "./totals-card";

type Row<T extends SubscriptionCore> = ComputedSubscription<T>;

export interface RenewalsListProps<T extends SubscriptionCore> {
  groups: { upcoming: Row<T>[]; ending: Row<T>[]; archived: Row<T>[] };
  totals: CurrencyTotals;
  /** Omit for a read-only view (public demo): rows are then not links. */
  hrefFor?: (row: Row<T>) => string;
  showArchived?: boolean;
  /** Omit to hide every add control. */
  addHref?: string;
  /** Alert offsets (days before cancel-by) for the Due soon section; omit to hide it. */
  alertOffsets?: number[];
}

function SectionHeading({ id, count, children }: { id: string; count: number; children: string }) {
  return (
    <div className="flex items-baseline gap-1.5 border-b border-line pb-1">
      <h2 id={id} className="section-label">
        {children}
      </h2>
      <span aria-hidden className="section-label">
        · {count}
      </span>
    </div>
  );
}

export function RenewalsList<T extends SubscriptionCore>({
  groups,
  totals,
  hrefFor,
  showArchived = false,
  addHref,
  alertOffsets,
}: RenewalsListProps<T>) {
  const { ending, archived } = groups;
  // Rows shown under Due soon are not repeated under Upcoming.
  const dueRows = alertOffsets ? new Set(dueSoon(groups.upcoming, alertOffsets).map((d) => d.row)) : null;
  const upcoming = dueRows ? groups.upcoming.filter((r) => !dueRows.has(r)) : groups.upcoming;
  const hasDue = dueRows !== null && dueRows.size > 0;
  const empty = upcoming.length === 0 && !hasDue && ending.length === 0 && !(showArchived && archived.length > 0);
  const key = (r: Row<T>, i: number) => `${r.input.name}-${i}`;

  return (
    <div className={`space-y-5 ${addHref ? "pb-20" : "pb-8"}`}>
      <TotalsCard totals={totals} />

      {empty ? (
        <section className="py-10 text-center">
          <p className="text-lg font-semibold">No subscriptions yet</p>
          {addHref && (
            <a href={addHref} className="link mt-3 inline-block min-h-11 px-4 py-2 font-medium">
              Add your first subscription
            </a>
          )}
        </section>
      ) : (
        <>
          {alertOffsets && <DueSoon rows={groups.upcoming} offsets={alertOffsets} hrefFor={hrefFor} />}
          {upcoming.length > 0 && (
            <section aria-labelledby="h-upcoming">
              <SectionHeading id="h-upcoming" count={upcoming.length}>Upcoming</SectionHeading>
              <ul>
                {upcoming.map((r, i) => (
                  <li key={key(r, i)}>
                    <RenewalRow row={r} href={hrefFor?.(r)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {ending.length > 0 && (
            <section aria-labelledby="h-ending">
              <SectionHeading id="h-ending" count={ending.length}>Ending</SectionHeading>
              <ul>
                {ending.map((r, i) => (
                  <li key={key(r, i)}>
                    <EndingRow row={r} href={hrefFor?.(r)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {showArchived && archived.length > 0 && (
            <section aria-labelledby="h-archived">
              <SectionHeading id="h-archived" count={archived.length}>Cancelled</SectionHeading>
              <ul>
                {archived.map((r, i) => (
                  <li key={key(r, i)}>
                    <EndingRow row={r} href={hrefFor?.(r)} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {addHref && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg px-4 py-2">
          <a href={addHref} className="btn-primary mx-auto flex w-full max-w-xl">
            Add subscription
          </a>
        </div>
      )}
    </div>
  );
}
