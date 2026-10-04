import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SubscriptionForm } from "./subscription-form";
import { emptyFormValues, type SubscriptionFormState } from "./subscription-form-values";

afterEach(cleanup);

const lookups = { categories: [{ id: "c1", name: "Software" }], paymentMethods: [{ id: "p1", name: "Card A" }] };

function setup(action = vi.fn<(p: SubscriptionFormState, f: FormData) => Promise<SubscriptionFormState>>()) {
  render(
    <SubscriptionForm
      mode="create"
      action={action}
      initialValues={{ ...emptyFormValues(), status: "confirmed" }}
      lookups={lookups}
      cancelHref="/"
    />,
  );
  return action;
}

describe("SubscriptionForm", () => {
  it("renders server field errors under the right field and keeps entered values", async () => {
    const action = vi.fn(async (_p: SubscriptionFormState, f: FormData) => ({
      fieldErrors: { amount: ["Enter an amount like 9.99"], currency: ["Choose a currency for the amount"] },
      values: Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)])),
    }));
    setup(action);
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Demo Sub" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "abc" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add subscription" }));
    });

    const amountError = await screen.findByText("Enter an amount like 9.99");
    expect(amountError.id).toBe("amount-error");
    expect(screen.getByLabelText("Amount").getAttribute("aria-describedby")).toBe("amount-error");
    expect(screen.getByText("Choose a currency for the amount").id).toBe("currency-error");
    expect((screen.getByLabelText("Name *") as HTMLInputElement).value).toBe("Demo Sub");
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("abc");
    expect(screen.queryByText(/Enter a name/)).toBeNull();
  });

  it("has an Account field with a hint, placed right after Plan, that is submitted", async () => {
    const action = vi.fn<(p: SubscriptionFormState, f: FormData) => Promise<SubscriptionFormState>>(async () => ({ fieldErrors: {}, values: null }));
    setup(action);
    const account = screen.getByLabelText("Account (optional)") as HTMLInputElement;
    expect(screen.getByText("The login email or username you use with this vendor. Never a password.")).toBeTruthy();
    const plan = screen.getByLabelText("Plan");
    expect(plan.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Name *"), { target: { value: "Demo Sub" } });
    fireEvent.change(account, { target: { value: "me@example.com" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add subscription" }));
    });
    expect(action.mock.calls[0][1].get("account_label")).toBe("me@example.com");
  });

  it("has no status control and no Cancelled option on create (D12)", () => {
    setup();
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(screen.queryByRole("option", { name: /cancelled/i })).toBeNull();
    expect(screen.queryByLabelText(/Access until/)).toBeNull();
  });

  it("shows status as read-only text on edit and never submits it", () => {
    render(
      <SubscriptionForm
        mode="edit"
        action={vi.fn()}
        initialValues={{ ...emptyFormValues(), name: "Demo Sub", status: "cancelled" }}
        lookups={lookups}
        cancelHref="/"
      />,
    );
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(screen.queryByLabelText(/Access until/)).toBeNull();
    expect(document.querySelector('[name="status"]')).toBeNull();
  });

  it("shows the computed default notice as placeholder for the selected cycle", () => {
    setup();
    const notice = screen.getByLabelText("Cancel notice (days)") as HTMLInputElement;
    expect(notice.placeholder).toBe("7 (default)");
    fireEvent.change(screen.getByLabelText("Billing cycle"), { target: { value: "monthly" } });
    expect(notice.placeholder).toBe("3 (default)");
  });
});
