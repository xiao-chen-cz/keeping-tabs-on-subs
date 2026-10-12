import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScreenshotField } from "./screenshot-field";

afterEach(cleanup);

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
});
