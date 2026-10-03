import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CancelForm } from "./cancel-form";
import type { CancelFormState } from "@/lib/validation/cancel-form";

afterEach(cleanup);

describe("CancelForm", () => {
  it("defaults Cancelled on to today and lists the channels", () => {
    render(<CancelForm action={vi.fn()} today="2026-10-04" cancelHref="/subscriptions/1" />);
    expect((screen.getByLabelText("Cancelled on") as HTMLInputElement).value).toBe("2026-10-04");
    expect(screen.getByRole("option", { name: "Website / app" })).toBeTruthy();
    expect(screen.getByLabelText("Confirmation number (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Note (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Access until (optional)")).toBeTruthy();
  });

  it("renders server validation errors under the right fields and keeps typed values", async () => {
    const action = vi.fn(async (): Promise<CancelFormState> => ({
      fieldErrors: { channel: ["Choose how you cancelled"], occurredOn: ["The date cannot be in the future"] },
      values: null,
    }));
    render(<CancelForm action={action} today="2026-10-04" cancelHref="/" />);
    fireEvent.change(screen.getByLabelText("Confirmation number (optional)"), { target: { value: "ABC-123" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Mark as cancelled" }));
    });
    expect((await screen.findByText("Choose how you cancelled")).id).toBe("channel-error");
    expect(screen.getByText("The date cannot be in the future").id).toBe("occurredOn-error");
    expect(screen.getByLabelText("How").getAttribute("aria-invalid")).toBe("true");
    expect((screen.getByLabelText("Confirmation number (optional)") as HTMLInputElement).value).toBe("ABC-123");
  });
});
