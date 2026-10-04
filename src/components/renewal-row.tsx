import { Fragment, type ReactNode } from "react";
import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDay, relativeDays } from "./format";
import { Tag } from "./tag";

export const rowClass = "block border-b border-line py-3";
const linkClass = `${rowClass} active:bg-light`;

/** Wraps row content in a link only when an href is given (read-only otherwise). */
export function RowShell({ href, children }: { href?: string; children: ReactNode }) {
  // Plain anchor on purpose: no framework coupling, works for the public demo too.
  return href ? (
    <a href={href} className={linkClass}>
      {children}
    </a>
  ) : (
    <div className={rowClass}>{children}</div>
  );
}

/** One muted line of segments joined with " · ". Lines break only between segments, never inside one. */
export function MetaLine({ parts }: { parts: ReactNode[] }) {
  const shown = parts.filter((p) => p !== null && p !== false && p !== undefined);
  if (shown.length === 0) return null;
  return (
    <p className="mt-0.5 text-sm text-mid">
      {shown.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{p}</span>
        </Fragment>
      ))}
    </p>
  );
}

export function RenewalRow<T extends SubscriptionCore>({ row, href }: { row: ComputedSubscription<T>; href?: string }) {
  const { input, computed: c } = row;
  const { amountCents, currency } = input;
  const amount =
    c.renewalAmountCents !== null && currency !== null ? (
      <span className="tabular-nums">
        {c.priceRises && amountCents !== null ? (
          <>
            <span>{(amountCents / 100).toFixed(2)}</span>
            <span aria-label="rises to"> → </span>
            <span className="font-medium text-danger">{(c.renewalAmountCents / 100).toFixed(2)}</span> {currency}
          </>
        ) : (
          formatMoney(c.renewalAmountCents, currency)
        )}
      </span>
    ) : null;

  const cancel =
    c.cancelBy !== null && c.daysUntilCancelBy !== null ? (
      c.daysUntilCancelBy < 0 ? (
        <span className="font-medium text-danger">deadline passed</span>
      ) : (
        <span>
          cancel by {formatDay(c.cancelBy)} ({relativeDays(c.daysUntilCancelBy)})
        </span>
      )
    ) : null;

  const renews =
    c.nextRenewal !== null && c.daysUntilRenewal !== null ? (
      <span>
        renews {formatDay(c.nextRenewal)} ({relativeDays(c.daysUntilRenewal)})
      </span>
    ) : null;

  return (
    <RowShell href={href}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-base font-semibold text-text">{input.name}</span>
        {c.tags.needsUpdate && <Tag kind="needsUpdate" />}
        {c.tags.trial && <Tag kind="trial" />}
      </div>
      <MetaLine parts={c.tags.needsUpdate ? [amount, <span key="m">Missing renewal date or cycle</span>] : [amount, renews, cancel]} />
    </RowShell>
  );
}
