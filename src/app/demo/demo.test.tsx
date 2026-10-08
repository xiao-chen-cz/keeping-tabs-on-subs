import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RenewalsList } from "@/components/renewals-list";
import { ReviewInbox } from "@/components/review-inbox";
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
    expect(demoRow("14", TODAY)).toBeUndefined();
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
        updatesName={f.existing?.subscription.name ?? null} existing={f.existing?.subscription ?? null}
        asNewHref={`/demo/review/${key}?as=new`} captureText={f.captureText}
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
    const approve = screen.getAllByRole("button", { name: "Approve (demo)" })[0] as HTMLButtonElement;
    expect(approve.disabled).toBe(true); // the billing-cycle question is still open
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(approve.disabled).toBe(false);
    fireEvent.click(approve);
    expect(screen.getByRole("status").textContent).toMatch(/Nothing was saved here/);
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });

  it("P2 shows the update notice and the price change", () => {
    view("P2");
    expect(screen.getByText(/This will update CodePilot Pro/)).toBeTruthy();
    expect(screen.getByText(/Price changed: \$20\.00 → \$25\.00/)).toBeTruthy();
  });

  it("P2 links to ?as=new, which shows no update notice", async () => {
    const { default: Page } = await import("./review/[key]/page");
    const props = (q: Record<string, string>) =>
      ({ params: Promise.resolve({ key: "P2" }), searchParams: Promise.resolve(q) }) as never;
    const first = render(await Page(props({})));
    expect(screen.getByRole("link", { name: "Add as a separate subscription" }).getAttribute("href")).toBe("/demo/review/P2?as=new");
    first.unmount();
    render(await Page(props({ as: "new" })));
    expect(screen.queryByText(/This will update/)).toBeNull();
    expect(screen.queryByText(/Price changed/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Add as a separate subscription" })).toBeNull();
  });

  it("P1 (new entry) has no separate-subscription block", () => {
    view("P1");
    expect(screen.queryByText("Not the same subscription?")).toBeNull();
  });
});

describe("review inbox row", () => {
  it("sits under Due soon and says what is inside", () => {
    const { groups, totals } = demoView(TODAY);
    const { container } = render(
      <RenewalsList groups={groups} totals={totals} alertOffsets={[...DEFAULT_ALERT_OFFSETS]}
        inbox={<ReviewInbox count={3} href="/demo/review" />} />,
    );
    const link = screen.getByRole("link", { name: /3 new entries to check/ });
    expect(link.getAttribute("href")).toBe("/demo/review");
    const due = screen.getByRole("region", { name: /due soon/i });
    // Due soon comes first in the document, then the inbox row.
    expect(due.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain("Not in your list yet");
  });
  it("is hidden when nothing waits, and singular for one", () => {
    const { container, rerender } = render(<ReviewInbox count={0} href="/review" />);
    expect(container.textContent).toBe("");
    rerender(<ReviewInbox count={1} href="/review" />);
    expect(screen.getByText("1 new entry to check")).toBeTruthy();
  });
});
