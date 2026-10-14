// §3.3 Totals per currency, unrounded cents; round only for display (P8, E36).
import { MONTHLY_FACTOR, type ComputedSubscription, type Currency, type SubscriptionCore } from "./types";

export type CurrencyTotals = Partial<Record<Currency, { monthly: number; yearly: number }>>;

/** A row's monthly-equivalent cost in its currency, or null when totals leave it out (cancelled, active trial, incomplete). */
function monthlyShare<T extends SubscriptionCore>({ input, computed }: ComputedSubscription<T>): { currency: Currency; cents: number } | null {
  const { amountCents, currency, billingCycle } = input;
  if (input.status !== "confirmed" || computed.tags.trial) return null;
  if (amountCents === null || currency === null || billingCycle === null) return null;
  return { currency, cents: amountCents * MONTHLY_FACTOR[billingCycle] };
}

export function totalsByCurrency<T extends SubscriptionCore>(rows: ComputedSubscription<T>[]): CurrencyTotals {
  const monthly: Partial<Record<Currency, number>> = {};
  for (const row of rows) {
    const share = monthlyShare(row);
    if (share) monthly[share.currency] = (monthly[share.currency] ?? 0) + share.cents;
  }
  const out: CurrencyTotals = {};
  for (const [cur, m] of Object.entries(monthly) as [Currency, number][]) out[cur] = { monthly: m, yearly: m * 12 };
  return out;
}

export type CategorySpend = { category: string | null; monthly: number };

/** Monthly spend per category and currency, same rows as totalsByCurrency; largest first. */
export function spendByCategory<T extends SubscriptionCore & { category?: string | null }>(
  rows: ComputedSubscription<T>[],
): Partial<Record<Currency, CategorySpend[]>> {
  const sums = new Map<Currency, Map<string | null, number>>();
  for (const row of rows) {
    const share = monthlyShare(row);
    if (!share) continue;
    const byCat = sums.get(share.currency) ?? new Map<string | null, number>();
    const cat = row.input.category ?? null;
    byCat.set(cat, (byCat.get(cat) ?? 0) + share.cents);
    sums.set(share.currency, byCat);
  }
  const out: Partial<Record<Currency, CategorySpend[]>> = {};
  for (const [cur, byCat] of sums) {
    out[cur] = [...byCat].map(([category, monthly]) => ({ category, monthly })).sort((a, b) => b.monthly - a.monthly);
  }
  return out;
}

export const formatMoney = (cents: number, currency: Currency): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(cents / 100);
