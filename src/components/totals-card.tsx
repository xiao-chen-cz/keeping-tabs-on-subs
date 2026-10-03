import { formatMoney, type CurrencyTotals } from "@/lib/domain/totals";
import type { Currency } from "@/lib/domain/types";

export function TotalsCard({ totals }: { totals: CurrencyTotals }) {
  const entries = Object.entries(totals) as [Currency, { monthly: number; yearly: number }][];
  if (entries.length === 0) return null;
  return (
    <section
      aria-label="Totals"
      className="rounded-2xl bg-indigo-50 p-4 text-indigo-950 dark:bg-indigo-950/60 dark:text-indigo-50"
    >
      <h2 className="mb-1 text-xs font-medium uppercase tracking-wide opacity-70">Total spend</h2>
      <ul className="space-y-1">
        {entries.map(([currency, t]) => (
          <li key={currency} className="text-base font-semibold">
            {formatMoney(Math.round(t.monthly), currency)} / month
            <span className="font-normal opacity-60"> · </span>
            {formatMoney(Math.round(t.yearly), currency)} / year
          </li>
        ))}
      </ul>
    </section>
  );
}
