import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import { formatDayLong } from "./format";
import { RowShell } from "./renewal-row";
import { Tag } from "./tag";

export function EndingRow<T extends SubscriptionCore>({ row, href }: { row: ComputedSubscription<T>; href?: string }) {
  const { accessUntil } = row.input;
  return (
    <RowShell href={href}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{row.input.name}</span>
        {row.computed.tags.ending && <Tag kind="ending" />}
      </div>
      {accessUntil && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">access until {formatDayLong(accessUntil)}</p>
      )}
    </RowShell>
  );
}
