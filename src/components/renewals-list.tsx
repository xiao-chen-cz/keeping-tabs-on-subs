import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import type { CurrencyTotals } from "@/lib/domain/totals";
import { dueSoon } from "@/lib/domain/alerts";
import {
  applyBaseFilters,
  applyFilters,
  categoryTabs,
  isFiltered,
  listHref,
  NO_CATEGORY,
  type Filterable,
  type ListFilters,
} from "@/lib/domain/filters";
import { totalsByCurrency } from "@/lib/domain/totals";
import { CategoryTabs, TabsSwitch } from "./category-tabs";
import { FilterBar } from "./filter-bar";
import { DueSoon } from "./due-soon";
import { EndingRow } from "./ending-row";
import { RenewalRow } from "./renewal-row";
import { TotalsCard } from "./totals-card";

type Row<T extends SubscriptionCore> = ComputedSubscription<T>;

export interface RenewalsListProps<T extends SubscriptionCore & Filterable> {
  groups: { upcoming: Row<T>[]; ending: Row<T>[]; archived: Row<T>[] };
  totals: CurrencyTotals;
  /** Omit for a read-only view (public demo): rows are then not links. */
  hrefFor?: (row: Row<T>) => string;
  showArchived?: boolean;
  /** Omit to hide every add control. */
  addHref?: string;
  /** Alert offsets (days before cancel-by) for the Due soon section; omit to hide it. */
  alertOffsets?: number[];
  /** Omit to hide the tabs and filter bar. Totals then come from `totals`. */
  filters?: ListFilters;
  /** Category tabs on or off (the `kts_tabs` cookie). Off ignores `filters.category`. Default on. */
  tabsEnabled?: boolean;
  /** Path of the list page, for tab / clear links and the filter form. Default "/". */
  basePath?: string;
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

export function RenewalsList<T extends SubscriptionCore & Filterable>({
  groups,
  totals,
  hrefFor,
  showArchived = false,
  addHref,
  alertOffsets,
  filters,
  tabsEnabled = true,
  basePath = "/",
}: RenewalsListProps<T>) {
  // Due soon is never filtered. Everything else (lists, tab counts, totals) follows the filters.
  const f: ListFilters | null = filters ? { ...filters, category: tabsEnabled ? filters.category : null } : null;
  const dueRows = alertOffsets ? new Set(dueSoon(groups.upcoming, alertOffsets).map((d) => d.row)) : null;
  const keepAll = <R extends { input: Filterable }>(rows: R[]) => (f ? applyFilters(rows, f) : rows);
  const filteredUpcomingAll = keepAll(groups.upcoming);
  // Rows shown under Due soon are not repeated under Upcoming.
  const upcoming = dueRows ? filteredUpcomingAll.filter((r) => !dueRows.has(r)) : filteredUpcomingAll;
  const ending = keepAll(groups.ending);
  const archived = keepAll(groups.archived);
  const filtered = f !== null && isFiltered(f);
  const shownTotals = filtered ? totalsByCurrency(filteredUpcomingAll) : totals;
  const totalsLabel = f && filtered
    ? [
        f.category === NO_CATEGORY ? "No category" : f.category,
        f.scope && f.scope.charAt(0).toUpperCase() + f.scope.slice(1),
        f.q && `“${f.q}”`,
        "total",
      ].filter(Boolean).join(" · ")
    : undefined;
  const unfilteredEmpty =
    groups.upcoming.length === 0 && groups.ending.length === 0 && !(showArchived && groups.archived.length > 0);
    const nothingMatches =
    filtered && upcoming.length === 0 && ending.length === 0 && !(showArchived && archived.length > 0);
  const hrefWith = (over: { cat?: string | null }) =>
    listHref(basePath, {
      cat: "cat" in over ? over.cat : f?.category,
      q: f?.q,
      scope: f?.scope,
      showCancelled: showArchived,
    });
  const currentHref = hrefWith({});
  const tabRows = f ? [...applyBaseFilters(groups.upcoming, f).filter((r) => !dueRows?.has(r)), ...applyBaseFilters(groups.ending, f)] : [];
  const clearHref = filtered ? listHref(basePath, { showCancelled: showArchived, cat: null }) : null;
  const key = (r: Row<T>, i: number) => `${r.input.name}-${i}`;

  return (
    <div className={`space-y-5 ${addHref ? "pb-20" : "pb-8"}`}>
      {/* Without filters the totals lead the page; with filters they sit under the controls that change them. */}
      {!f && <TotalsCard totals={shownTotals} label={totalsLabel} />}

      {unfilteredEmpty ? (
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
          {f &&
            (tabsEnabled ? (
              <CategoryTabs tabs={categoryTabs(tabRows)} active={f.category} hrefFor={(cat) => hrefWith({ cat })} currentHref={currentHref} />
            ) : (
              <div className="flex justify-end">
                <TabsSwitch on={false} currentHref={currentHref} />
              </div>
            ))}
          {f && (
            <FilterBar
              action={basePath}
              q={f.q}
              scope={f.scope}
              cat={f.category}
              showCancelled={showArchived}
              clearHref={clearHref}
            />
          )}
          {f && <TotalsCard totals={shownTotals} label={totalsLabel} />}
          {nothingMatches && (
            <section className="py-8 text-center">
              <p className="font-semibold">Nothing matches these filters.</p>
              {clearHref && (
                <a href={clearHref} className="link mt-2 inline-flex min-h-11 items-center">
                  Clear
                </a>
              )}
            </section>
          )}
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
