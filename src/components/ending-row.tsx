import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import { formatDayLong } from "./format";
import { MetaLine, RowShell } from "./renewal-row";
import { Tag } from "./tag";

export function EndingRow<T extends SubscriptionCore>({ row, href }: { row: ComputedSubscription<T>; href?: string }) {
  const { accessUntil } = row.input;
  return (
    <RowShell href={href}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-base font-semibold text-text">{row.input.name}</span>
        {row.computed.tags.ending && <Tag kind="ending" />}
      </div>
      <MetaLine parts={[accessUntil ? <span key="a">access until {formatDayLong(accessUntil)}</span> : null]} />
    </RowShell>
  );
}
