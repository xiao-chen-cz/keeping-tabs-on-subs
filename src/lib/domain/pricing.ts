// §2.6 Renewal amount and §2.7 Price rises. Money in integer cents.
import { compare } from "@/lib/dates/plain-date";
import type { PlainDate, SubscriptionCore } from "./types";

/** Regular price applies only when both promo fields are set and promoEnds <= next renewal (E18-E23). */
export function renewalAmountCents(
  core: Pick<SubscriptionCore, "amountCents" | "regularPriceCents" | "promoEnds">,
  next: PlainDate | null,
): number | null {
  if (core.amountCents === null) return null; // E24
  const { regularPriceCents: regular, promoEnds } = core;
  if (regular !== null && promoEnds !== null && next !== null && compare(promoEnds, next) <= 0) return regular;
  return core.amountCents;
}

/** Null when there is nothing to compare; a price drop is false. */
export const priceRises = (amount: number | null, renewal: number | null): boolean | null =>
  amount === null || renewal === null ? null : renewal > amount;
