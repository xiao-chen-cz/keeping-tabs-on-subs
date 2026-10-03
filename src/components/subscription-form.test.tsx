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

  it("shows access until only when status is Cancelled", () => {
    setup();
    expect(screen.queryByLabelText("Access until")).toBeNull();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "cancelled" } });
    expect(screen.getByLabelText("Access until")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "confirmed" } });
    expect(screen.queryByLabelText("Access until")).toBeNull();
  });

  it("shows the computed default notice as placeholder for the selected cycle", () => {
    setup();
    const notice = screen.getByLabelText("Cancel notice (days)") as HTMLInputElement;
    expect(notice.placeholder).toBe("7 (default)");
    fireEvent.change(screen.getByLabelText("Billing cycle"), { target: { value: "monthly" } });
    expect(notice.placeholder).toBe("3 (default)");
  });
});
