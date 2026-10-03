// §2.8 Flags. Cancelled rows are never Trial or Needs update (E26).
import { compare } from "@/lib/dates/plain-date";
import { isActiveTrial } from "./schedule";
import type { PlainDate, SubscriptionCore } from "./types";

export const isTrial = (c: SubscriptionCore, today: PlainDate): boolean =>
  c.status === "confirmed" && isActiveTrial(c, today);

/** D2: no next renewal on a confirmed row. */
export const needsUpdate = (c: SubscriptionCore, next: PlainDate | null): boolean =>
  c.status === "confirmed" && next === null;

/** D6: cancelled with access still running (E34). */
export const isEnding = (c: SubscriptionCore, today: PlainDate): boolean =>
  c.status === "cancelled" && c.accessUntil !== null && compare(c.accessUntil, today) >= 0;

/** E35: cancelled and not (or no longer) ending. */
export const isArchived = (c: SubscriptionCore, today: PlainDate): boolean =>
  c.status === "cancelled" && !isEnding(c, today);
