import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { RenewalsList } from "@/components/renewals-list";
import { SubscriptionDetail } from "@/components/subscription-detail";
import { DEFAULT_ALERT_OFFSETS } from "@/lib/domain/alerts";
import { demoRow, demoView } from "./demo-data";

afterEach(cleanup);
const TODAY = "2026-10-02";

function renderList() {
  const { groups, totals } = demoView(TODAY);
  return render(
    <RenewalsList groups={groups} totals={totals} hrefFor={(r) => `/demo/${r.input.key}`}
      alertOffsets={[...DEFAULT_ALERT_OFFSETS]} />,
  );
}

describe("demo list", () => {
  it("puts PixelStock first in Upcoming and tags StreamBox as Trial", () => {
    renderList();
    const items = within(screen.getByRole("region", { name: "Upcoming" })).getAllByRole("listitem");
    expect(items[0].textContent).toContain("PixelStock");
    const stream = items.find((i) => i.textContent?.includes("StreamBox Prime"));
    expect(stream?.textContent).toContain("Trial");
  });

  it("lists FitClub Online under Ending", () => {
    renderList();
    const ending = within(screen.getByRole("region", { name: /ending/i }));
    expect(ending.getByText(/FitClub Online/)).toBeTruthy();
  });

  it("is read-only: links stay under /demo, no add or edit controls", () => {
    const { container } = renderList();
    for (const a of container.querySelectorAll("a")) {
      expect(a.getAttribute("href")).toMatch(/^\/demo\/\d+$/);
    }
    expect(container.innerHTML).not.toMatch(/\/subscriptions|\/new/);
    expect(screen.queryByText(/Add subscription/)).toBeNull();
    expect(screen.queryByText(/Edit/)).toBeNull();
  });
});

describe("demo detail", () => {
  it("finds rows by key and rejects unknown keys", () => {
    expect(demoRow("8", TODAY)?.input.name).toBe("PixelStock");
    expect(demoRow("13", TODAY)).toBeUndefined();
    expect(demoRow("abc", TODAY)).toBeUndefined();
  });

  it("renders without an edit link", () => {
    render(<SubscriptionDetail row={demoRow("1", TODAY)!} />);
    expect(screen.queryByText(/Edit/)).toBeNull();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
