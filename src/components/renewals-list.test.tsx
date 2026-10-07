import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";
import type { SubscriptionCore } from "@/lib/domain/types";
import { subscriptionHref } from "@/lib/domain/needs-update";
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

  it("links Needs update rows to /complete and the others to the detail page", () => {
    const withIds = rows.map((r, i) => ({ ...r, id: `id${i}` }));
    const computed = withIds.map((r) => computeSubscription({ ...core(r), id: r.id }, TODAY));
    render(
      <RenewalsList
        groups={groupAndSort(computed)}
        totals={totalsByCurrency(computed)}
        hrefFor={(r) => subscriptionHref(r.input.id, r.computed.tags.needsUpdate)}
      />,
    );
    const href = (name: string) => screen.getByRole("link", { name: new RegExp(name) }).getAttribute("href");
    expect(href("Missing")).toBe("/subscriptions/id1/complete");
    expect(href("Alpha")).toBe("/subscriptions/id0");
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
    expect(screen.getByRole("link").getAttribute("href")).toBe("/subscriptions/new");
  });

  it("has no links in read-only mode, and row links when hrefFor is given (no add bar: + Add lives in the header)", () => {
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
    expect(screen.queryByText("Add subscription")).toBeNull();
    expect(screen.getAllByRole("link").length).toBe(rows.length);
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

  it("on the day of a charge shows 'charged today · next …' instead of a red deadline", () => {
    const { groups, totals } = fixture([{ name: "Paid Today", ...monthly, lastRenewalDate: TODAY }]);
    render(<RenewalsList groups={groups} totals={totals} />);
    const upcoming = screen.getByRole("region", { name: "Upcoming" });
    expect(within(upcoming).getByText("charged today")).toBeTruthy();
    expect(within(upcoming).getByText("next 3 Nov")).toBeTruthy();
    expect(within(upcoming).queryByText("deadline passed")).toBeNull();
  });
});

describe("RenewalsList account labels", () => {
  const withAccount = (r: Partial<SubscriptionCore>, accountLabel: string | null) => ({ ...core(r), accountLabel });
  const render3 = (inputs: ReturnType<typeof withAccount>[], extra: Partial<React.ComponentProps<typeof RenewalsList>> = {}) => {
    const computed = inputs.map((r) => computeSubscription(r, TODAY));
    render(<RenewalsList groups={groupAndSort(computed)} totals={totalsByCurrency(computed)} {...extra} />);
  };

  it("shows the account only on rows whose name is shared (case-insensitive), in Upcoming and Ending", () => {
    render3([
      withAccount({ name: "CodePilot Pro", ...monthly, lastRenewalDate: "2026-09-20" }, "me@example.com"),
      withAccount({ name: "codepilot pro", ...monthly, lastRenewalDate: "2026-09-25" }, "work@example.com"),
      withAccount({ name: "Solo", ...monthly, lastRenewalDate: "2026-09-22" }, "solo@example.com"),
      withAccount({ name: "Solo Two", ...monthly, lastRenewalDate: "2026-09-22" }, null),
    ]);
    const text = document.body.textContent ?? "";
    expect(text).toContain("me@example.com");
    expect(text).toContain("work@example.com");
    expect(text).not.toContain("solo@example.com");
  });

  it("counts an Ending row as the other row with the same name", () => {
    render3([
      withAccount({ name: "FitClub", ...monthly, lastRenewalDate: "2026-09-20" }, "me@example.com"),
      withAccount({ name: "FitClub", ...monthly, status: "cancelled", accessUntil: "2026-10-20" }, "old@example.com"),
    ]);
    const ending = within(screen.getByRole("region", { name: "Ending" })).getAllByRole("listitem")[0];
    expect(ending.textContent).toContain("old@example.com");
    expect(within(screen.getByRole("region", { name: "Upcoming" })).getByRole("listitem").textContent).toContain("me@example.com");
  });

  it("shows the account in Due soon rows too", () => {
    render3(
      [
        withAccount({ name: "CodePilot Pro", ...monthly, lastRenewalDate: "2026-09-08" }, "me@example.com"), // cancel by 5 Oct
        withAccount({ name: "CodePilot Pro", ...monthly, lastRenewalDate: "2026-09-25" }, "work@example.com"),
      ],
      { alertOffsets: [3, 1, 0] },
    );
    const due = screen.getByRole("region", { name: "Due soon" });
    expect(due.textContent).toContain("me@example.com");
  });
});
