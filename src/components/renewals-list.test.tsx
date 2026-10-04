import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";
import type { SubscriptionCore } from "@/lib/domain/types";
import { RenewalsList } from "./renewals-list";

afterEach(cleanup);

const TODAY = "2026-10-03";

function fixture(rows: Partial<SubscriptionCore>[]) {
  const computed = rows.map((r) => computeSubscription(core(r), TODAY));
  return { groups: groupAndSort(computed), totals: totalsByCurrency(computed) };
}

const monthly = { amountCents: 1000, currency: "EUR", billingCycle: "monthly" } as const;

const rows: Partial<SubscriptionCore>[] = [
  { name: "Alpha", ...monthly, lastRenewalDate: "2026-09-08" }, // next 8 Oct, cancel by 5 Oct
  { name: "Missing", status: "confirmed" }, // needs update
  { name: "Trially", ...monthly, trialEnds: "2026-10-20", lastRenewalDate: null },
  {
    name: "Pricey",
    ...monthly,
    amountCents: 12000,
    regularPriceCents: 20000,
    promoEnds: "2026-09-30",
    lastRenewalDate: "2026-09-15",
  },
  { name: "Late", ...monthly, lastRenewalDate: "2026-09-04", cancelNoticeDays: 3 }, // next 4 Oct, cancel by 1 Oct
  { name: "Gone", ...monthly, status: "cancelled", accessUntil: "2026-10-20" },
];

describe("RenewalsList", () => {
  const { groups, totals } = fixture(rows);

  it("renders Needs update first and the Trial tag", () => {
    render(<RenewalsList groups={groups} totals={totals} />);
    const items = within(screen.getByRole("region", { name: "Upcoming" })).getAllByRole("listitem");
    expect(items[0].textContent).toContain("Missing");
    expect(items[0].textContent).toContain("Needs update");
    expect(items[0].textContent).toContain("Missing renewal date or cycle");
    expect(screen.getByText("Trial")).toBeTruthy();
  });

  it("shows the price rise, deadline passed and cancel-by", () => {
    render(<RenewalsList groups={groups} totals={totals} />);
    expect(screen.getByText(/120\.00/).textContent).toBe("120.00");
    expect(screen.getByText(/200\.00/)).toBeTruthy();
    expect(screen.getByText("deadline passed")).toBeTruthy();
    expect(screen.getByText("cancel by 5 Oct (in 2 days)")).toBeTruthy();
  });

  it("renders the Ending group and totals", () => {
    render(<RenewalsList groups={groups} totals={totals} />);
    const ending = screen.getByRole("region", { name: "Ending" });
    expect(ending.textContent).toContain("Gone");
    expect(ending.textContent).toContain("access until 20 Oct 2026");
    expect(screen.getByText(/ \/ month/)).toBeTruthy();
  });

  it("hides archived unless asked", () => {
    const f = fixture([{ name: "Old", ...monthly, status: "cancelled", accessUntil: "2026-01-01" }]);
    const { unmount } = render(<RenewalsList groups={f.groups} totals={f.totals} />);
    expect(screen.queryByText("Old")).toBeNull();
    unmount();
    render(<RenewalsList groups={f.groups} totals={f.totals} showArchived />);
    expect(screen.getByText("Old")).toBeTruthy();
  });

  it("shows the empty state, with an add link only when addHref is given", () => {
    const f = fixture([]);
    const { unmount } = render(<RenewalsList groups={f.groups} totals={f.totals} />);
    expect(screen.getByText("No subscriptions yet")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    unmount();
    render(<RenewalsList groups={f.groups} totals={f.totals} addHref="/subscriptions/new" />);
    expect(screen.getAllByRole("link").length).toBe(2);
  });

  it("has no links in read-only mode, and links when hrefFor/addHref are given", () => {
    const { unmount } = render(<RenewalsList groups={groups} totals={totals} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    unmount();
    render(
      <RenewalsList
        groups={groups}
        totals={totals}
        hrefFor={(r) => `/s/${r.input.name}`}
        addHref="/subscriptions/new"
      />,
    );
    expect(screen.getByText("Add subscription").getAttribute("href")).toBe("/subscriptions/new");
    expect(screen.getAllByRole("link").length).toBe(rows.length + 1);
  });

  it("shows a due row once, under Due soon only; others stay under Upcoming", () => {
    const f = fixture([
      { name: "Soonish", ...monthly, lastRenewalDate: "2026-09-06" }, // cancel-by 3 Oct: due today
      { name: "Faraway", ...monthly, lastRenewalDate: "2026-09-16" }, // cancel-by 13 Oct
    ]);
    render(<RenewalsList groups={f.groups} totals={f.totals} alertOffsets={[3, 1, 0]} />);
    expect(screen.getAllByText("Soonish")).toHaveLength(1);
    const due = within(screen.getByRole("region", { name: "Due soon" }));
    expect(due.getByText("Soonish")).toBeTruthy();
    const upcoming = within(screen.getByRole("region", { name: "Upcoming" }));
    expect(upcoming.queryByText("Soonish")).toBeNull();
    expect(upcoming.getByText("Faraway")).toBeTruthy();
  });

  it("hides Upcoming when every row is due", () => {
    const f = fixture([{ name: "Soonish", ...monthly, lastRenewalDate: "2026-09-06" }]);
    render(<RenewalsList groups={f.groups} totals={f.totals} alertOffsets={[3, 1, 0]} />);
    expect(screen.getByRole("region", { name: "Due soon" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Upcoming" })).toBeNull();
    expect(screen.queryByText("No subscriptions yet")).toBeNull();
  });
});
