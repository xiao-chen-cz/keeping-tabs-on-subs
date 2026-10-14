import { formatMoney, type CategorySpend, type CurrencyTotals } from "@/lib/domain/totals";
import type { Currency } from "@/lib/domain/types";
import { InfoIcon } from "./icons";

// Each default category keeps one colour whatever its rank or filter (validated palette in globals.css).
// Other, no category and user-added categories share the grey.
const CATEGORY_SLOTS = [
  "AI",
  "Software / SaaS",
  "Infrastructure / Hosting",
  "Content / Media",
  "Memberships / Communities",
  "App Store",
  "Insurance",
  "Finance / Banking",
];
const slot = (category: string | null) => {
  const i = category === null ? -1 : CATEGORY_SLOTS.indexOf(category);
  return i === -1 ? CATEGORY_SLOTS.length : i;
};
const colour = (category: string | null) => {
  const i = slot(category);
  return i < CATEGORY_SLOTS.length ? `var(--cat-${i + 1})` : "var(--cat-other)";
};

/** Folds every grey category into one "Other" segment, then orders by colour slot so neighbours stay distinguishable. */
function segments(spend: CategorySpend[]): { label: string; category: string | null; monthly: number }[] {
  const named = spend.filter((s) => slot(s.category) < CATEGORY_SLOTS.length);
  const other = spend.filter((s) => slot(s.category) === CATEGORY_SLOTS.length).reduce((sum, s) => sum + s.monthly, 0);
  return [
    ...named.sort((a, b) => slot(a.category) - slot(b.category)).map((s) => ({ label: s.category ?? "", category: s.category, monthly: s.monthly })),
    ...(other > 0 ? [{ label: "Other", category: null, monthly: other }] : []),
  ];
}

function CategoryBar({ spend, currency }: { spend: CategorySpend[]; currency: Currency }) {
  const segs = segments(spend);
  if (segs.length < 2) return null;
  const total = segs.reduce((sum, s) => sum + s.monthly, 0);
  return (
    <div className="mt-3">
      <div
        role="img"
        aria-label={`Monthly spend by category: ${segs.map((s) => `${s.label} ${formatMoney(Math.round(s.monthly), currency)}`).join(", ")}`}
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
      >
        {segs.map((s) => (
          <span key={s.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.monthly / total) * 100}%`, background: colour(s.category) }} />
        ))}
      </div>
      <ul aria-hidden className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-mid">
        {segs.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="size-2 rounded-full" style={{ background: colour(s.category) }} />
            {s.label} <span className="font-medium text-text tabular-nums">{formatMoney(Math.round(s.monthly), currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TotalsCard({
  totals,
  label = "Total spend",
  spend,
}: {
  totals: CurrencyTotals;
  label?: string;
  /** Monthly spend per category (spendByCategory); draws a bar per currency when there are two or more. */
  spend?: Partial<Record<Currency, CategorySpend[]>>;
}) {
  const entries = Object.entries(totals) as [Currency, { monthly: number; yearly: number }][];
  if (entries.length === 0) return null;
  return (
    <section aria-label="Totals" className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="section-label">{label}</h2>
        <details className="relative">
          <summary className="-m-2 flex cursor-pointer list-none p-2 text-mid [&::-webkit-details-marker]:hidden" aria-label="What is counted">
            <InfoIcon />
          </summary>
          <p className="absolute right-0 z-10 mt-1 w-52 rounded-control border border-line bg-surface p-2 text-xs text-mid shadow-md">
            Excludes trials and cancelled subscriptions.
          </p>
        </details>
      </div>
      <ul className="divide-y divide-line">
        {entries.map(([currency, t]) => (
          <li key={currency} className="py-2 first:pt-1 last:pb-0">
            <p className="text-text">
              <span className="font-heading text-3xl font-semibold tabular-nums">{formatMoney(Math.round(t.monthly), currency)}</span>
              <span className="text-sm text-mid"> / month</span>
            </p>
            <p className="text-sm text-mid tabular-nums">{formatMoney(Math.round(t.yearly), currency)} a year</p>
            {spend?.[currency] && <CategoryBar spend={spend[currency]} currency={currency} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
