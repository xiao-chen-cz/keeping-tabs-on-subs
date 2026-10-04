import { formatMoney, type CurrencyTotals } from "@/lib/domain/totals";
import type { Currency } from "@/lib/domain/types";

export function TotalsCard({ totals, label = "Total spend" }: { totals: CurrencyTotals; label?: string }) {
  const entries = Object.entries(totals) as [Currency, { monthly: number; yearly: number }][];
  if (entries.length === 0) return null;
  return (
    <section aria-label="Totals" className="rounded-control border border-line px-3 py-2 text-sm text-mid">
      <h2 className="section-label mb-0.5">{label}</h2>
      <ul className="space-y-0.5">
        {entries.map(([currency, t]) => (
          <li key={currency}>
            <span className="font-semibold text-text">{formatMoney(Math.round(t.monthly), currency)} / month</span>
            <span> · </span>
            <span className="font-semibold text-text">{formatMoney(Math.round(t.yearly), currency)} / year</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
