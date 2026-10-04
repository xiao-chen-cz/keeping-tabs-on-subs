import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";
import type { SubscriptionCore } from "@/lib/domain/types";
import { DueSoon } from "./due-soon";

afterEach(cleanup);

const TODAY = "2026-10-03";
const monthly = { amountCents: 1000, currency: "EUR", billingCycle: "monthly" } as const;
const mk = (rows: Partial<SubscriptionCore>[]) => rows.map((r) => computeSubscription(core(r), TODAY));

describe("DueSoon", () => {
  it("shows a due row with cancel-by and the price rise", () => {
    const rows = mk([
      {
        name: "VoiceDraft",
        ...monthly,
        amountCents: 12000,
        currency: "USD",
        regularPriceCents: 20000,
        promoEnds: "2026-09-30",
        lastRenewalDate: "2026-09-06", // next 6 Oct, cancel-by 3 Oct
      },
    ]);
    render(<DueSoon rows={rows} offsets={[3, 1, 0]} />);
    expect(screen.getByText("Due soon")).toBeTruthy();
    expect(screen.getByText("VoiceDraft")).toBeTruthy();
    expect(screen.getByText("cancel by 3 Oct")).toBeTruthy();
    expect(screen.getByText("today")).toBeTruthy(); // the days pill
    expect(screen.getByText("120.00")).toBeTruthy();
    expect(screen.getByText("200.00")).toBeTruthy();
  });

  it("does not show a row outside its alert window (L = 10) and hides when empty", () => {
    const rows = mk([{ name: "Faraway", ...monthly, lastRenewalDate: "2026-09-16" }]); // cancel-by 13 Oct
    expect(rows[0].computed.daysUntilCancelBy).toBe(10);
    const { container } = render(<DueSoon rows={rows} offsets={[3, 1, 0]} />);
    expect(screen.queryByText("Faraway")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("renders links when hrefFor is given", () => {
    const rows = mk([{ name: "Soonish", ...monthly, lastRenewalDate: "2026-09-06" }]);
    render(<DueSoon rows={rows} offsets={[3]} hrefFor={() => "/x"} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/x");
  });
});
