import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/dal/auth-actions", () => ({ signOut: vi.fn() }));
const { HeaderMenu } = await import("./header-menu");

afterEach(cleanup);

describe("HeaderMenu", () => {
  it("is closed until tapped, then shows Settings, Replay tour and Sign out", () => {
    render(<HeaderMenu />);
    const button = screen.getByRole("button", { name: "Menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Settings")).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
    expect(screen.getByRole("link", { name: "Replay tour" }).getAttribute("href")).toBe("/?tour=1");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });

  it("closes on Escape and on a tap outside", () => {
    render(<HeaderMenu />);
    const button = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Settings")).toBeNull();
    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByText("Settings")).toBeNull();
  });
});
