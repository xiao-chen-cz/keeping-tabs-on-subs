import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CompleteScreen } from "./complete-screen";
import { formValuesFromSubscription } from "./subscription-form-values";
import { core } from "@/lib/domain/fixtures";
import { missingForSchedule } from "@/lib/domain/needs-update";
import type { Subscription } from "@/lib/domain/types";

afterEach(cleanup);

// Seed PixelStock: no cycle, trial ended 5 days ago, no billing date.
const sub: Subscription = {
  ...core({ name: "PixelStock", amountCents: 999, currency: "USD", trialEnds: "2026-09-29" }),
  id: "px",
  vendor: null,
  plan: null,
  category: null,
  paymentMethod: null,
  scope: null,
  confidence: null,
  cancelUrl: null,
  notes: null,
  source: "manual",
  keptForCancelBy: null,
};

function setup() {
  render(
    <CompleteScreen
      name={sub.name}
      initialValues={formValuesFromSubscription(sub, { categoryId: null, paymentMethodId: null })}
      questions={missingForSchedule(sub)}
      lookups={{ categories: [], paymentMethods: [] }}
      action={vi.fn()}
      detailHref="/subscriptions/px"
      trialEndedHref="/subscriptions/px/cancel?reason=trial-ended"
    />,
  );
}

const save = () => screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;

describe("CompleteScreen", () => {
  it("shows exactly the missing questions and keeps Save disabled until all are answered", () => {
    setup();
    expect(screen.getByRole("heading", { name: "2 missing" })).toBeTruthy();
    expect(screen.getByText("How often is it charged?")).toBeTruthy();
    expect(screen.getByText("When was the last charge, or when is the next one?")).toBeTruthy();
    expect(screen.queryByText("How much is each charge?")).toBeNull();
    expect(screen.queryByText("Which currency?")).toBeNull();
    expect(screen.getByText("The app can't work out the next renewal. Answer these to fix it.")).toBeTruthy();
    expect(save().disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(save().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("When was the last charge, or when is the next one?"), {
      target: { value: "2026-10-31" },
    });
    expect(save().disabled).toBe(false);
  });

  it("an option tap fills the form; the date answer fills the billing date, never the trial end", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect((screen.getByLabelText("Billing cycle") as HTMLSelectElement).value).toBe("monthly");
    fireEvent.change(screen.getByLabelText("When was the last charge, or when is the next one?"), {
      target: { value: "2026-10-31" },
    });
    expect((screen.getByLabelText("Billing date (last or next charge)") as HTMLInputElement).value).toBe("2026-10-31");
    expect((screen.getByLabelText("Trial ends") as HTMLInputElement).value).toBe("2026-09-29");
  });

  it("offers the trial-ended cancel link", () => {
    setup();
    const link = screen.getByRole("link", { name: "Mark as cancelled" });
    expect(link.getAttribute("href")).toBe("/subscriptions/px/cancel?reason=trial-ended");
  });
});
