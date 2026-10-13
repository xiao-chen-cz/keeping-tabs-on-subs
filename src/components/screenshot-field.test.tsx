import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CLIPBOARD_BLOCKED, NO_CLIPBOARD_IMAGE, ScreenshotField } from "./screenshot-field";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClipboard(read: () => Promise<{ types: string[]; getType: (t: string) => Promise<Blob> }[]>) {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { read } });
}

describe("ScreenshotField", () => {
  it("offers a camera button that opens the back camera and hands the photo to the parent", () => {
    const onFile = vi.fn();
    render(<ScreenshotField id="file" label="Upload" file={null} onFile={onFile} />);
    const camera = screen.getByLabelText("Take a photo") as HTMLInputElement;
    expect(camera.getAttribute("capture")).toBe("environment");
    expect(camera.accept).toBe("image/*");

    const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(camera, { target: { files: [photo] } });
    expect(onFile).toHaveBeenCalledWith(photo);
  });

  it("shows the camera button and hides the paste hint only on touch screens", () => {
    render(<ScreenshotField id="file" label="Upload" file={null} onFile={vi.fn()} />);
    expect(screen.getByText("Take a photo").className).toMatch(/\bhidden\b.*pointer-coarse:inline-flex/);
    expect(screen.getByText(/paste it here/).className).toContain("pointer-coarse:hidden");
  });

  it("pastes a copied screenshot from the clipboard on a tap", async () => {
    stubClipboard(async () => [{ types: ["image/png"], getType: async () => new Blob(["x"], { type: "image/png" }) }]);
    const onFile = vi.fn();
    render(<ScreenshotField id="file" label="Upload" file={null} onFile={onFile} />);
    expect(screen.getByRole("button", { name: "Paste screenshot" }).className).toContain("pointer-coarse:inline-flex");
    fireEvent.click(screen.getByRole("button", { name: "Paste screenshot" }));
    await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1));
    const file = onFile.mock.calls[0][0] as File;
    expect([file.name, file.type]).toEqual(["pasted-screenshot.png", "image/png"]);
  });

  it("explains how to copy a screenshot when the clipboard holds none", async () => {
    stubClipboard(async () => [{ types: ["text/plain"], getType: async () => new Blob(["hi"]) }]);
    render(<ScreenshotField id="file" label="Upload" file={null} onFile={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Paste screenshot" }));
    expect((await screen.findByRole("alert")).textContent).toBe(NO_CLIPBOARD_IMAGE);
  });

  it("points to Choose file when the browser blocks the clipboard", async () => {
    stubClipboard(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    render(<ScreenshotField id="file" label="Upload" file={null} onFile={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Paste screenshot" }));
    expect((await screen.findByRole("alert")).textContent).toBe(CLIPBOARD_BLOCKED);
  });
});
