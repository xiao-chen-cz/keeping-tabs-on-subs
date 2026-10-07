import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CancelForm } from "./cancel-form";
import { trialEndedPrefill } from "@/lib/domain/needs-update";
import type { CancelFormState } from "@/lib/validation/cancel-form";

afterEach(cleanup);

describe("CancelForm", () => {
  it("defaults Cancelled on to today and lists the channels", () => {
    render(<CancelForm action={vi.fn()} userId="u1" today="2026-10-04" cancelHref="/subscriptions/1" />);
    expect((screen.getByLabelText("Cancelled on") as HTMLInputElement).value).toBe("2026-10-04");
    expect(screen.getByRole("option", { name: "Website / app" })).toBeTruthy();
    expect(screen.getByLabelText("Confirmation number (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Note (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Access until (optional)")).toBeTruthy();
  });

  it("prefills for a trial that ended without converting, and stays editable", () => {
    render(
      <CancelForm
        action={vi.fn()}
        userId="u1"
        today="2026-10-04"
        cancelHref="/"
        initial={trialEndedPrefill("2026-09-29", "2026-10-04")}
      />,
    );
    expect((screen.getByLabelText("Cancelled on") as HTMLInputElement).value).toBe("2026-09-29");
    expect((screen.getByLabelText("How") as HTMLSelectElement).value).toBe("other");
    const note = screen.getByLabelText("Note (optional)") as HTMLTextAreaElement;
    expect(note.value).toBe("Trial ended without converting");
    fireEvent.change(note, { target: { value: "x" } });
    expect(note.value).toBe("x");
  });

  it("trialEndedPrefill uses today when the trial end is missing or in the future", () => {
    expect(trialEndedPrefill(null, "2026-10-04").occurredOn).toBe("2026-10-04");
    expect(trialEndedPrefill("2026-10-09", "2026-10-04").occurredOn).toBe("2026-10-04");
    expect(trialEndedPrefill("2026-10-04", "2026-10-04").occurredOn).toBe("2026-10-04");
  });

  it("renders server validation errors under the right fields and keeps typed values", async () => {
    const action = vi.fn(async (): Promise<CancelFormState> => ({
      fieldErrors: { channel: ["Choose how you cancelled"], occurredOn: ["The date cannot be in the future"] },
      values: null,
    }));
    render(<CancelForm action={action} userId="u1" today="2026-10-04" cancelHref="/" />);
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
