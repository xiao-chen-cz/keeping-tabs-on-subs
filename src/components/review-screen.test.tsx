import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { existingSub, proposal } from "./review-fixtures";
import { ReviewScreen } from "./review-screen";
import { missingFromValues, proposalFormValues } from "./review-values";
import type { Proposal } from "@/lib/dal/map-proposal";
import type { SubscriptionFormState } from "./subscription-form-values";

afterEach(cleanup);

const lookups = { categories: [{ id: "c1", name: "Software" }], paymentMethods: [] };

function setup(p: Proposal, updatesName: string | null = null) {
  const initialValues = proposalFormValues(p, null);
  const approve = vi.fn<(prev: SubscriptionFormState, f: FormData) => Promise<SubscriptionFormState>>();
  render(
    <ReviewScreen
      proposal={p}
      updatesName={updatesName}
      captureText="Your Gymbox membership: 30.00 per month"
      initialValues={initialValues}
      questions={missingFromValues(initialValues)}
      lookups={lookups}
      approveAction={approve}
      rejectAction={vi.fn(async () => {})}
    />,
  );
  return approve;
}

const approveButton = () => screen.getByRole("button", { name: "Approve" }) as HTMLButtonElement;

describe("ReviewScreen", () => {
  it("asks no questions when nothing is missing, and Approve is enabled", () => {
    setup(proposal({ name: "NoteForge", amountCents: 799, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-10-31" }));
    expect(screen.queryByRole("heading", { name: /question/ })).toBeNull();
    expect(approveButton().disabled).toBe(false);
  });

  it("asks one fixed question per missing field and keeps Approve disabled until all are answered", () => {
    setup(proposal({ name: "Gymbox", amountCents: 3000 }));
    expect(screen.getByRole("heading", { name: "3 missing" })).toBeTruthy();
    expect(screen.getByText("Which currency?")).toBeTruthy();
    expect(screen.getByText("How often is it charged?")).toBeTruthy();
    expect(screen.getByText("When was the last charge, or when is the next one?")).toBeTruthy();
    expect(screen.queryByText("What is the subscription called?")).toBeNull();
    expect(screen.queryByText("How much is each charge?")).toBeNull();
    expect(approveButton().disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "EUR" }));
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(approveButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("When was the last charge, or when is the next one?"), { target: { value: "2026-10-31" } });
    expect(approveButton().disabled).toBe(false);
  });

  it("tapping an option fills the form field below", () => {
    setup(proposal({ name: "Gymbox", amountCents: 3000 }));
    fireEvent.click(screen.getByRole("button", { name: "EUR" }));
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect((screen.getByLabelText("Currency") as HTMLSelectElement).value).toBe("EUR");
    expect((screen.getByLabelText("Billing cycle") as HTMLSelectElement).value).toBe("monthly");
    expect(screen.getByRole("button", { name: "EUR" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("marks missing fields in the form and the panel, and clears them as answers come in", () => {
    setup(proposal({ name: "Gymbox", amountCents: 3000, currency: "EUR" }));
    expect(document.querySelector('[data-missing="billing_cycle"]')?.textContent).toBe("Missing");
    expect(document.querySelector('[data-missing="amount"]')).toBeNull();
    expect(screen.getByLabelText("Billing cycle").getAttribute("aria-describedby")).toBe("billing_cycle-missing");
    expect(screen.getByLabelText("Billing cycle").getAttribute("aria-invalid")).toBeNull();
    expect(screen.getByRole("heading", { name: "2 missing" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(document.querySelector('[data-missing="billing_cycle"]')).toBeNull();
    expect(screen.getByRole("heading", { name: "1 missing" })).toBeTruthy();
    expect(screen.getByText("Answered: Monthly")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Billing date (last or next charge)"), { target: { value: "2026-10-31" } });
    expect(screen.getByRole("heading", { name: "All answered" })).toBeTruthy();
    expect(document.querySelector('[data-missing]')).toBeNull();
  });

  it("a typed amount that does not parse does not unlock Approve", () => {
    setup(proposal({ name: "X", currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-10-31" }));
    expect(approveButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("How much is each charge?"), { target: { value: "abc" } });
    expect(approveButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("How much is each charge?"), { target: { value: "9,99" } });
    expect(approveButton().disabled).toBe(false);
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("9,99");
  });

  it("shows the capture text, the update banner, confidence markers and a Reject button; no status field", () => {
    setup(
      proposal({ name: "CodePilot Pro", amountCents: 1900, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-10-03", fieldConfidence: { billingCycle: "medium", category: "low", amountCents: "high" } }),
      "CodePilot Pro",
    );
    expect(screen.getByText("What the app read")).toBeTruthy();
    expect(screen.getByText("Your Gymbox membership: 30.00 per month")).toBeTruthy();
    expect(screen.getByText("This will update CodePilot Pro.")).toBeTruthy();
    expect(document.querySelector('[data-confidence="medium"]')?.textContent).toBe("medium");
    expect(document.querySelector('[data-confidence="low"]')?.textContent).toBe("low");
    expect(document.querySelectorAll("[data-confidence]").length).toBe(2);
    expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
    expect(screen.queryByText(/Status/)).toBeNull();
  });

  it("shows Unnamed until a name is answered", () => {
    setup(proposal({ amountCents: 100 }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Unnamed");
    fireEvent.change(screen.getByLabelText("What is the subscription called?"), { target: { value: "Gymbox" } });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Gymbox");
  });
});

describe("ReviewScreen update proposals", () => {
  const sub = existingSub({ amountCents: 2000, currency: "USD" });
  const draft = { name: "CodePilot Pro", amountCents: 2500, currency: "USD" as const, billingCycle: "monthly" as const, lastRenewalDate: "2026-09-03" };
  const renderIt = (updatesName: string | null, existing = sub, detach = vi.fn(async () => {})) => {
    const p = proposal(draft);
    const initialValues = proposalFormValues(p, updatesName ? { subscription: existing, categoryId: null, paymentMethodId: null } : null);
    render(
      <ReviewScreen proposal={p} updatesName={updatesName} existing={updatesName ? existing : null} captureText="x"
        initialValues={initialValues} questions={missingFromValues(initialValues)} lookups={lookups}
        approveAction={vi.fn()} rejectAction={vi.fn(async () => {})} detachAction={detach} />,
    );
    return detach;
  };

  it("shows the price change with the danger tone for a rise, and the detach button", () => {
    renderIt("CodePilot Pro");
    const li = screen.getByText(/Price changed: \$20\.00 → \$25\.00/);
    expect(li.getAttribute("data-tone")).toBe("rise");
    expect(screen.getByText("Not the same subscription?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add as a separate subscription" })).toBeTruthy();
  });

  it("offers no detach button on a new proposal", () => {
    renderIt(null);
    expect(screen.queryByText("Not the same subscription?")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add as a separate subscription" })).toBeNull();
    expect(screen.queryByText(/Price changed/)).toBeNull();
  });
});
