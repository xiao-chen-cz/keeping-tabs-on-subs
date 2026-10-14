import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CaptureForm } from "./capture-form";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderForm = () => render(<CaptureForm action={vi.fn(async () => ({ error: null }))} userId="u1" />);

describe("CaptureForm", () => {
  it("offers Take photo (phones only), Upload, and Enter text, with Enter text open", () => {
    renderForm();
    const tabs = screen.getAllByRole("button", { pressed: false }).concat(screen.getAllByRole("button", { pressed: true }));
    expect(tabs.map((b) => b.textContent).sort()).toEqual(["Take photo", "Enter text", "Upload"].sort());
    expect(screen.getByRole("button", { name: "Take photo" }).className).toMatch(/\bhidden\b.*pointer-coarse:inline-flex/);
    expect(screen.getByRole("button", { name: "Enter text" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText(/Describe the subscription in a few words, or paste/)).toBeTruthy();
  });

  it("opens the camera from Take photo and shows the photo with Retake", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    expect(click).toHaveBeenCalledTimes(1);

    const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Camera"), { target: { files: [photo] } });
    expect(screen.getByAltText("The photo you took")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retake" }));
    expect(click).toHaveBeenCalledTimes(2);
  });

  it("asks for a photo before reading when none was taken", () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Read it" }));
    expect(screen.getByRole("alert").textContent).toBe("Take a photo first.");
  });

  it("has no second camera button on the Upload option", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(screen.queryByText("Take a photo")).toBeNull();
    expect(screen.getByText("Got an email? Take a screenshot, copy it, then tap Paste screenshot.")).toBeTruthy();
  });
});
