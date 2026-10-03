import type { ReactNode } from "react";
import type { ComputedSubscription, SubscriptionCore } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/totals";
import { formatDay, relativeDays } from "./format";
import { Tag } from "./tag";

export const rowClass =
  "block min-h-14 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
const linkClass = `${rowClass} active:bg-neutral-50 dark:active:bg-neutral-800`;

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

export function RenewalRow<T extends SubscriptionCore>({ row, href }: { row: ComputedSubscription<T>; href?: string }) {
  const { input, computed: c } = row;
  const { amountCents, currency } = input;
  const amount =
    c.renewalAmountCents !== null && currency !== null ? (
      <p className="text-sm font-medium tabular-nums">
        {c.priceRises && amountCents !== null ? (
          <>
            <span className="text-neutral-500 dark:text-neutral-400">{(amountCents / 100).toFixed(2)}</span>
            <span aria-label="rises to"> → </span>
            <span className="text-red-700 dark:text-red-400">{(c.renewalAmountCents / 100).toFixed(2)}</span>{" "}
            {currency}
          </>
        ) : (
          formatMoney(c.renewalAmountCents, currency)
        )}
      </p>
    ) : null;

  const cancel =
    c.cancelBy !== null && c.daysUntilCancelBy !== null ? (
      c.daysUntilCancelBy < 0 ? (
        <p className="text-sm font-medium text-red-700 dark:text-red-400">deadline passed</p>
      ) : (
        <p className="text-sm">
          cancel by {formatDay(c.cancelBy)} ({relativeDays(c.daysUntilCancelBy)})
        </p>
      )
    ) : null;

  return (
    <RowShell href={href}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{input.name}</span>
        {c.tags.needsUpdate && <Tag kind="needsUpdate" />}
        {c.tags.trial && <Tag kind="trial" />}
      </div>
      {amount}
      {c.tags.needsUpdate ? (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Missing renewal date or cycle</p>
      ) : (
        <div className="mt-1 space-y-0.5 text-sm text-neutral-600 dark:text-neutral-400">
          {c.nextRenewal !== null && c.daysUntilRenewal !== null && (
            <p>
              renews {formatDay(c.nextRenewal)} ({relativeDays(c.daysUntilRenewal)})
            </p>
          )}
          {cancel}
          {c.planStartsLater && input.lastRenewalDate && <p>plan starts on {formatDay(input.lastRenewalDate)}</p>}
        </div>
      )}
    </RowShell>
  );
}
