// §3.1 Upcoming, plus the Ending and archive groups (§2.8).
import { compare } from "@/lib/dates/plain-date";
import type { ComputedSubscription, PlainDate, SubscriptionCore } from "./types";

type Row<T extends SubscriptionCore> = ComputedSubscription<T>;

const byName = (a: SubscriptionCore, b: SubscriptionCore) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

// Null dates only occur on Needs update rows, which are all first; keep them last within any group.
const cmpNullable = (a: PlainDate | null, b: PlainDate | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : compare(a, b);

function upcomingOrder<T extends SubscriptionCore>(a: Row<T>, b: Row<T>): number {
  const [x, y] = [a.computed, b.computed];
  if (x.tags.needsUpdate !== y.tags.needsUpdate) return x.tags.needsUpdate ? -1 : 1;
  return (
    cmpNullable(x.cancelBy, y.cancelBy) || cmpNullable(x.nextRenewal, y.nextRenewal) || byName(a.input, b.input)
  );
}

export function groupAndSort<T extends SubscriptionCore>(
  rows: Row<T>[],
): { upcoming: Row<T>[]; ending: Row<T>[]; archived: Row<T>[] } {
  const cancelled = rows.filter((r) => r.input.status === "cancelled");
  return {
    upcoming: rows.filter((r) => r.input.status !== "cancelled").sort(upcomingOrder),
    ending: cancelled
      .filter((r) => r.computed.tags.ending)
      .sort((a, b) => cmpNullable(a.input.accessUntil, b.input.accessUntil) || byName(a.input, b.input)),
    archived: cancelled.filter((r) => r.computed.archived).sort((a, b) => byName(a.input, b.input)),
  };
}
