// §3.3 Totals per currency, unrounded cents; round only for display (P8, E36).
import { MONTHLY_FACTOR, type ComputedSubscription, type Currency, type SubscriptionCore } from "./types";

export type CurrencyTotals = Partial<Record<Currency, { monthly: number; yearly: number }>>;

export function totalsByCurrency<T extends SubscriptionCore>(rows: ComputedSubscription<T>[]): CurrencyTotals {
  const monthly: Partial<Record<Currency, number>> = {};
  for (const { input, computed } of rows) {
    const { amountCents, currency, billingCycle } = input;
    if (input.status !== "confirmed" || computed.tags.trial) continue;
    if (amountCents === null || currency === null || billingCycle === null) continue;
    monthly[currency] = (monthly[currency] ?? 0) + amountCents * MONTHLY_FACTOR[billingCycle];
  }
  const out: CurrencyTotals = {};
  for (const [cur, m] of Object.entries(monthly) as [Currency, number][]) out[cur] = { monthly: m, yearly: m * 12 };
  return out;
}

export const formatMoney = (cents: number, currency: Currency): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(cents / 100);
