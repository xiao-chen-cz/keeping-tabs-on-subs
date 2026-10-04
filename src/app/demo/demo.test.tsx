import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RenewalsList } from "@/components/renewals-list";
import { SubscriptionDetail } from "@/components/subscription-detail";
import { DEFAULT_ALERT_OFFSETS } from "@/lib/domain/alerts";
import { ReviewScreen } from "@/components/review-screen";
import { missingFromValues, proposalFormValues } from "@/components/review-values";
import { DEMO_LOOKUPS, demoProposal, demoProposals, demoRow, demoView } from "./demo-data";
import DemoReviewQueuePage from "./review/page";

vi.mock("next/server", () => ({ connection: async () => {} }));

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

describe("demo review queue", () => {
  const view = (key: string) => {
    const f = demoProposal(key, TODAY)!;
    const initialValues = proposalFormValues(f.proposal, f.existing);
    return render(
      <ReviewScreen readOnly backHref="/demo/review" proposal={f.proposal}
        updatesName={f.existing?.subscription.name ?? null} captureText={f.captureText}
        initialValues={initialValues} questions={missingFromValues(initialValues)} lookups={DEMO_LOOKUPS} />,
    );
  };

  it("has three proposals P1-P3 and rejects unknown keys", () => {
    expect(demoProposals(TODAY).map((p) => p.key)).toEqual(["P1", "P2", "P3"]);
    expect(demoProposal("P9", TODAY)).toBeUndefined();
  });

  it("queue page lists 3 proposals linking under /demo/review", async () => {
    render(await DemoReviewQueuePage());
    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/demo/review/"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/demo/review/P1", "/demo/review/P2", "/demo/review/P3"]);
  });

  it("P1 asks the billing-cycle question, marked Missing", () => {
    const { container } = view("P1");
    expect(container.textContent).toMatch(/Billing cycle/);
    expect(screen.getAllByText(/Missing/).length).toBeGreaterThan(0);
  });

  it("demo Approve waits for the answers, then explains instead of saving; no Reject", () => {
    view("P1");
    const approve = screen.getByRole("button", { name: "Approve (demo)" }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true); // the billing-cycle question is still open
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(approve.disabled).toBe(false);
    fireEvent.click(approve);
    expect(screen.getByRole("status").textContent).toMatch(/Nothing was saved here/);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });

  it("P2 shows the update notice", () => {
    view("P2");
    expect(screen.getByText(/This will update CodePilot Pro/)).toBeTruthy();
  });
});
