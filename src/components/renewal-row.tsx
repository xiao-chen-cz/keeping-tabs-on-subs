import { Fragment, type ReactNode } from "react";
import type { ComputedSubscription, Currency, SubscriptionCore } from "@/lib/domain/types";
import { accountToShow } from "@/lib/domain/duplicates";
import { formatMoney } from "@/lib/domain/totals";
import { formatDay, relativeDays } from "./format";
import { Tag } from "./tag";

export const rowClass = "block border-b border-line py-3";
const linkClass = `${rowClass} active:bg-light`;

/** Wraps row content in a link only when an href is given (read-only otherwise). */
export function RowShell({ href, className = rowClass, children }: { href?: string; className?: string; children: ReactNode }) {
  // Plain anchor on purpose: no framework coupling, works for the public demo too.
  return href ? (
    <a href={href} className={className === rowClass ? linkClass : `${className} active:bg-light`}>
      {children}
    </a>
  ) : (
    <div className={className}>{children}</div>
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

type WithAccount = { accountLabel?: string | null; alertMode?: "remind" | "quiet" };

/** The account segment of the meta line (null unless the name is shared with another row). */
export function accountPart(duplicates: ReadonlySet<string> | undefined, input: { name: string } & WithAccount): ReactNode {
  const label = accountToShow(duplicates, input);
  return label ? <span key="acct">{label}</span> : null;
}

export type Tone = "calm" | "soon" | "urgent" | "info" | "warn";

const TONES: Record<Tone, string> = {
  calm: "border-line bg-light text-text",
  soon: "border-warn-line bg-warn-bg text-warn-ink",
  urgent: "border-danger/40 bg-danger-light text-danger",
  info: "border-primary-ink/20 bg-primary-light text-primary-ink",
  warn: "border-warn-line bg-warn-bg text-warn-ink",
};

/** Colour of a countdown to the cancel-by date: red in the last day (or passed), amber within a week. */
export const toneForDays = (days: number): Tone => (days <= 1 ? "urgent" : days <= 7 ? "soon" : "calm");

/** The square on the left of a row: days left to cancel, or a short word. Visual only; the row text says the same. */
export function CountdownTile({ days, word, tone }: { days?: number; word?: string; tone: Tone }) {
  return (
    <span aria-hidden className={`flex size-13 shrink-0 flex-col items-center justify-center rounded-lg border leading-none ${TONES[tone]}`}>
      {word !== undefined ? (
        <span className="text-sm font-semibold">{word}</span>
      ) : (
        <>
          <span className="text-xl font-semibold tabular-nums">{days}</span>
          <span className="mt-0.5 text-[11px]">{days === 1 ? "day" : "days"}</span>
        </>
      )}
    </span>
  );
}

/** The amount on the right of a row; a price rise shows the new price in red over the old one, struck through. */
export function AmountBlock({ cents, fromCents, currency }: { cents: number | null; fromCents?: number | null; currency: Currency | null }) {
  if (cents === null || currency === null) return null;
  const rises = fromCents !== null && fromCents !== undefined && fromCents !== cents;
  return (
    <span className="flex shrink-0 flex-col items-end tabular-nums">
      <span className={`text-base font-semibold ${rises ? "text-danger" : "text-text"}`}>
        {rises && <span className="sr-only">rises to </span>}
        {rises && <span aria-hidden>↑ </span>}
        {formatMoney(cents, currency)}
      </span>
      {rises && (
        <span className="text-xs text-mid">
          <span className="sr-only">, was </span>
          <s>{formatMoney(fromCents, currency)}</s>
        </span>
      )}
    </span>
  );
}

/** Tile, name with tags, one short line, amount. Shared by the list, Due soon and the tour examples. */
export function RowLayout({ tile, name, tags, sub, amount }: { tile: ReactNode; name: string; tags?: ReactNode; sub: ReactNode; amount?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {tile}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold break-words text-text">{name}</span>
          {tags}
        </div>
        {sub}
      </div>
      {amount}
    </div>
  );
}

export function RenewalRow<T extends SubscriptionCore & WithAccount>({
  row,
  href,
  duplicates,
}: {
  row: ComputedSubscription<T>;
  href?: string;
  /** Names shared by several rows (duplicateNames); their account label is shown. */
  duplicates?: ReadonlySet<string>;
}) {
  const { input, computed: c } = row;
  const account = accountPart(duplicates, input);

  let tile: ReactNode;
  let parts: ReactNode[];
  if (c.tags.needsUpdate) {
    tile = <CountdownTile word="?" tone="warn" />;
    parts = [<span key="m">Missing renewal date or cycle</span>];
  } else if (c.daysUntilRenewal === 0) {
    // On the day of the charge the cancel window is over anyway: no red "too late", show what comes next.
    tile = <CountdownTile word="Today" tone="info" />;
    parts = [
      <span key="t">{c.tags.trial ? "Trial ends today" : "Charged today"}</span>,
      c.followingRenewal && <span key="n">next {formatDay(c.followingRenewal)}</span>,
    ];
  } else if (c.cancelBy !== null && c.daysUntilCancelBy !== null && c.daysUntilCancelBy < 0) {
    tile = <CountdownTile word="Late" tone="urgent" />;
    parts = [
      <span key="l" className="font-medium text-danger">Too late to cancel</span>,
      c.nextRenewal && <span key="r">renews {formatDay(c.nextRenewal)}</span>,
    ];
  } else if (c.cancelBy !== null && c.daysUntilCancelBy !== null) {
    const d = c.daysUntilCancelBy;
    tile = d === 0 ? <CountdownTile word="Today" tone="urgent" /> : <CountdownTile days={d} tone={toneForDays(d)} />;
    parts = [
      <span key="c">
        Cancel by {formatDay(c.cancelBy)}
        <span className="sr-only"> ({relativeDays(d)})</span>
      </span>,
    ];
  } else {
    tile = <CountdownTile word="–" tone="calm" />;
    parts = [];
  }

  return (
    <RowShell href={href}>
      <RowLayout
        tile={tile}
        name={input.name}
        tags={
          <>
            {c.tags.needsUpdate && <Tag kind="needsUpdate" />}
            {c.tags.trial && <Tag kind="trial" />}
            {input.alertMode === "quiet" && <Tag kind="quiet" />}
          </>
        }
        sub={<MetaLine parts={[...parts, account]} />}
        amount={<AmountBlock cents={c.renewalAmountCents} fromCents={c.priceRises ? input.amountCents : null} currency={input.currency} />}
      />
    </RowShell>
  );
}
