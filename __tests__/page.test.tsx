import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

test("home page shows the app name", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Keeping Tabs on Subs" }),
  ).toBeDefined();
});
