// §2.3 Cancel notice and §2.4 Cancel-by.
import { addDays } from "@/lib/dates/plain-date";
import type { BillingCycle, PlainDate, SubscriptionCore } from "./types";

/** 3 days for Monthly / Every 4 weeks, 7 otherwise, also for an empty cycle (E12). */
export const defaultNoticeDays = (cycle: BillingCycle | null): number =>
  cycle === "monthly" || cycle === "every_4_weeks" ? 3 : 7;

/** The per-row override (D5) or the default. */
export const effectiveNotice = (core: Pick<SubscriptionCore, "cancelNoticeDays" | "billingCycle">): number =>
  core.cancelNoticeDays ?? defaultNoticeDays(core.billingCycle);

export const cancelBy = (next: PlainDate | null, notice: number): PlainDate | null =>
  next === null ? null : addDays(next, -notice);
