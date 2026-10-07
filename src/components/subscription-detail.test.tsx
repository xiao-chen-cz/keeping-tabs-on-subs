import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { SubscriptionEvent } from "@/lib/dal/map-proposal";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";
import type { Subscription } from "@/lib/domain/types";
import { describeEvent, SubscriptionDetail } from "./subscription-detail";

afterEach(cleanup);

const sub = (over: Partial<Subscription>): Subscription => ({
  ...core({ name: "Demo Sub", amountCents: 999, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-08" }),
  id: "1",
  vendor: null,
  plan: null,
  accountLabel: null,
  category: "Software",
  paymentMethod: null,
  scope: "personal",
  confidence: "high",
  cancelUrl: "https://example.com/cancel",
  notes: null,
  source: "seed",
  keptForCancelBy: null,
  alertMode: "remind",
  quietOfferShownAt: null,
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

  it("shows an Account row only when set", () => {
    const { unmount } = render(<SubscriptionDetail row={computeSubscription(sub({}), "2026-10-03")} />);
    expect(screen.queryByText("Account")).toBeNull();
    unmount();
    render(<SubscriptionDetail row={computeSubscription(sub({ accountLabel: "me@example.com" }), "2026-10-03")} />);
    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByText("me@example.com")).toBeTruthy();
  });

  it("shows access until for cancelled rows and Edit when editHref is given", () => {
    const r = computeSubscription(sub({ status: "cancelled", accessUntil: "2026-10-20", cancelNoticeDays: 5 }), "2026-10-03");
    render(<SubscriptionDetail row={r} editHref="/subscriptions/1/edit" />);
    expect(screen.getByText("20 Oct 2026")).toBeTruthy();
    expect(screen.getByText("Edit").getAttribute("href")).toBe("/subscriptions/1/edit");
  });

  it("offers Mark as cancelled for confirmed rows and Reopen for cancelled rows", () => {
    const reopen = async () => {};
    const { unmount } = render(
      <SubscriptionDetail row={computeSubscription(sub({}), "2026-10-03")} cancelHref="/subscriptions/1/cancel" reopenAction={reopen} />,
    );
    expect(screen.getByText("Mark as cancelled").getAttribute("href")).toBe("/subscriptions/1/cancel");
    expect(screen.queryByText("Reopen")).toBeNull();
    unmount();
    render(
      <SubscriptionDetail
        row={computeSubscription(sub({ status: "cancelled" }), "2026-10-03")}
        cancelHref="/subscriptions/1/cancel"
        reopenAction={reopen}
      />,
    );
    expect(screen.queryByText("Mark as cancelled")).toBeNull();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeTruthy();
  });

  it("renders the history newest first and the original capture", () => {
    const ev = (over: Partial<SubscriptionEvent>): SubscriptionEvent => ({
      id: "e",
      subscriptionId: "1",
      kind: "cancelled",
      occurredOn: "2026-10-04",
      channel: "website_app",
      reference: "ABC-123",
      note: null,
      captureId: null,
      cancelBy: null,
      recordedAt: "2026-10-04T10:00:00Z",
      ...over,
    });
    render(
      <SubscriptionDetail
        row={computeSubscription(sub({}), "2026-10-06")}
        events={[
          ev({ id: "2", kind: "reopened", occurredOn: "2026-10-05", channel: null, reference: null }),
          ev({ id: "1", note: "Called support first" }),
        ]}
        captureText="Receipt text from the vendor"
      />,
    );
    expect(screen.getByRole("heading", { name: "History" })).toBeTruthy();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toBe("Reopened on 5 Oct 2026");
    expect(items[1]).toBe("Cancelled on 4 Oct 2026 via Website / app · ref ABC-123Called support first");
    expect(screen.getByText("Original capture")).toBeTruthy();
    expect(screen.getByText("Receipt text from the vendor")).toBeTruthy();
  });

  it("links a cancellation's confirmation screenshot in the history", () => {
    const cancelled: SubscriptionEvent = {
      id: "1", subscriptionId: "1", kind: "cancelled", occurredOn: "2026-10-04", channel: "email", reference: null,
      note: null, captureId: "c1", cancelBy: null, recordedAt: "2026-10-04T10:00:00Z",
    };
    render(
      <SubscriptionDetail
        row={computeSubscription(sub({ status: "cancelled" }), "2026-10-06")}
        events={[cancelled]}
        proofFiles={{ c1: { url: "https://files.example/c1.png", mimeType: "image/png" } }}
      />,
    );
    const link = screen.getByRole("link", { name: "Confirmation screenshot" });
    expect(link.getAttribute("href")).toBe("https://files.example/c1.png");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("shows no History or Original capture without events or a capture", () => {
    render(<SubscriptionDetail row={computeSubscription(sub({}), "2026-10-03")} events={[]} />);
    expect(screen.queryByText("History")).toBeNull();
    expect(screen.queryByText("Original capture")).toBeNull();
  });
});

describe("describeEvent: kept", () => {
  it("names the cancel-by the Keep applies to", () => {
    expect(
      describeEvent({
        id: "k1", subscriptionId: "s1", kind: "kept", occurredOn: "2026-10-01", channel: null, reference: null,
        note: null, captureId: null, cancelBy: "2026-10-04", recordedAt: "2026-10-01T07:00:00Z",
      }),
    ).toBe("Kept on 1 Oct 2026 · cancel-by 4 Oct 2026");
  });
});
