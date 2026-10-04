import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CancelIntro } from "./cancel-intro";

afterEach(cleanup);

describe("CancelIntro", () => {
  it("shows the sign-in line under the cancel link when an account is set", () => {
    render(<CancelIntro cancelUrl="https://example.com/cancel" accountLabel="work@example.com" />);
    expect(screen.getByRole("link", { name: /cancel link/ }).getAttribute("href")).toBe("https://example.com/cancel");
    expect(screen.getByText("Sign in as work@example.com to cancel.")).toBeTruthy();
  });
  it("shows no sign-in line without an account", () => {
    render(<CancelIntro cancelUrl={null} accountLabel={null} />);
    expect(screen.queryByText(/Sign in as/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
