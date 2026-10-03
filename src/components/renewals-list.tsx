import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import type { CurrencyTotals } from "@/lib/domain/totals";
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

const h2 = "mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

export function RenewalsList<T extends SubscriptionCore>({
  groups,
  totals,
  hrefFor,
  showArchived = false,
  addHref,
  alertOffsets,
}: RenewalsListProps<T>) {
  const { upcoming, ending, archived } = groups;
  const empty = upcoming.length === 0 && ending.length === 0 && !(showArchived && archived.length > 0);
  const key = (r: Row<T>, i: number) => `${r.input.name}-${i}`;

  return (
    <div className={`mx-auto max-w-md space-y-6 px-4 pt-6 ${addHref ? "pb-28" : "pb-8"}`}>
      <TotalsCard totals={totals} />

      {empty ? (
        <section className="py-10 text-center">
          <p className="text-lg font-medium">No subscriptions yet</p>
          {addHref && (
            <a href={addHref} className="mt-3 inline-block min-h-12 px-4 py-3 font-medium text-indigo-700 dark:text-indigo-300">
              Add your first subscription
            </a>
          )}
        </section>
      ) : (
        <>
          {alertOffsets && <DueSoon rows={upcoming} offsets={alertOffsets} hrefFor={hrefFor} />}
          {upcoming.length > 0 && (
            <section aria-labelledby="h-upcoming">
              <h2 id="h-upcoming" className={h2}>Upcoming</h2>
              <ul className="space-y-2">
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
              <h2 id="h-ending" className={h2}>Ending</h2>
              <ul className="space-y-2">
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
              <h2 id="h-archived" className={h2}>Cancelled</h2>
              <ul className="space-y-2">
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
        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-white via-white to-transparent px-4 pb-4 pt-6 dark:from-neutral-950 dark:via-neutral-950">
          <a
            href={addHref}
            className="mx-auto flex min-h-12 max-w-md items-center justify-center rounded-full bg-indigo-600 px-6 font-medium text-white shadow-lg active:bg-indigo-700"
          >
            Add subscription
          </a>
        </div>
      )}
    </div>
  );
}
