import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { DueSoon } from "./due-soon";
import { AddedNotice, AlertActions, KeptForRenewal, KeptNotice, QuietNotice, RemindNotice } from "./alert-actions";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";

afterEach(cleanup);
const noop = async () => {};
// Monthly, last 2026-09-07 -> cancel-by 2026-10-04; today 2026-10-01 is offset 3.
const row = computeSubscription(
  { ...core({ name: "Notely", amountCents: 1000, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-07" }), id: "s1" },
  "2026-10-01",
);

describe("Due soon actions", () => {
  it("shows Keep and Cancelled when actions are given, with the row's cancel-by", () => {
    let seen = "";
    render(
      <DueSoon rows={[row]} offsets={[3, 1, 0]} actionsFor={(r, cb) => {
        seen = cb;
        return <AlertActions name={r.input.name} keep={noop} cancelHref="/subscriptions/s1/cancel?reason=alert" />;
      }} />,
    );
    const section = within(screen.getByRole("region", { name: /due soon/i }));
    expect(section.getByRole("button", { name: "Keep Notely" })).toBeTruthy();
    expect(section.getByRole("link", { name: "Notely cancelled" }).getAttribute("href")).toBe("/subscriptions/s1/cancel?reason=alert");
    expect(seen).toBe("2026-10-04");
  });

  it("has no buttons without actions (public demo)", () => {
    render(<DueSoon rows={[row]} offsets={[3, 1, 0]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("KeptNotice", () => {
  it("confirms the Keep without an offer", () => {
    render(<KeptNotice name="Notely" cancelBy="2026-10-04" undo={noop} />);
    expect(screen.getByRole("button", { name: "Undo keep Notely" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Kept Notely");
    expect(screen.queryByText(/Stop reminding/)).toBeNull();
  });

  it("asks once whether to stop reminders (E44)", () => {
    render(<KeptNotice name="Notely" cancelBy="2026-10-04" undo={noop} offer={{ accept: noop, decline: noop }} />);
    expect(screen.getByText("Stop reminding you about Notely?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep quietly" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Keep reminding me" })).toBeTruthy();
  });
});

describe("Undo", () => {
  it("QuietNotice offers Undo", () => {
    render(<QuietNotice name="Notely" undo={noop} />);
    expect(screen.getByRole("button", { name: "Undo keep quietly for Notely" })).toBeTruthy();
  });
  it("KeptForRenewal offers Remind me again", () => {
    render(<KeptForRenewal cancelBy="2026-10-04" remindAgain={noop} />);
    expect(screen.getByText(/no reminders before the cancel-by 4 Oct/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remind me again" })).toBeTruthy();
  });
});

describe("confirmations on the list", () => {
  it("after approving: says the entry is in the list, with its dates and a link to open it", () => {
    render(<AddedNotice name="Cloud Start" nextRenewal="2026-11-03" cancelBy="2026-10-31" href="/subscriptions/s1" />);
    expect(screen.getByRole("status").textContent).toContain("Cloud Start is now in your list. Renews 3 Nov, cancel by 31 Oct.");
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/subscriptions/s1");
  });

  it("after approving an entry without a schedule: no dates", () => {
    render(<AddedNotice name="Gymbox" nextRenewal={null} cancelBy={null} href="/subscriptions/s2/complete" />);
    expect(screen.getByRole("status").textContent).toContain("Gymbox is now in your list.");
    expect(screen.getByRole("status").textContent).not.toContain("Renews");
  });

  it("after saving Remind me", () => {
    render(<RemindNotice name="Cloud Start" />);
    expect(screen.getByRole("status").textContent).toBe("Saved. Cloud Start will remind you before each cancel-by.");
  });
});
