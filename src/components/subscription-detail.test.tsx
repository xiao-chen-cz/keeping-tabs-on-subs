import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";
import type { Subscription } from "@/lib/domain/types";
import { SubscriptionDetail } from "./subscription-detail";

afterEach(cleanup);

const sub = (over: Partial<Subscription>): Subscription => ({
  ...core({ name: "Demo Sub", amountCents: 999, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-08" }),
  id: "1",
  vendor: null,
  plan: null,
  category: "Software",
  paymentMethod: null,
  scope: "personal",
  confidence: "high",
  cancelUrl: "https://example.com/cancel",
  notes: null,
  source: "seed",
  keptForCancelBy: null,
  ...over,
});

describe("SubscriptionDetail", () => {
  it("shows fields, default notice and an external cancel link, no edit link when read-only", () => {
    render(<SubscriptionDetail row={computeSubscription(sub({}), "2026-10-03")} />);
    expect(screen.getByText("3 days (default)")).toBeTruthy();
    expect(screen.getByText("Monthly")).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("Access until")).toBeNull();
  });

  it("shows access until for cancelled rows and Edit when editHref is given", () => {
    const r = computeSubscription(sub({ status: "cancelled", accessUntil: "2026-10-20", cancelNoticeDays: 5 }), "2026-10-03");
    render(<SubscriptionDetail row={r} editHref="/subscriptions/1/edit" />);
    expect(screen.getByText("20 Oct 2026")).toBeTruthy();
    expect(screen.getByText("Edit").getAttribute("href")).toBe("/subscriptions/1/edit");
  });
});
