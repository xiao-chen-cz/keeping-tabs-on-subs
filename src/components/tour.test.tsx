import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_TOUR, Tour, type TourProps, type TourStop } from "./tour";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

const stops: TourStop[] = [
  { path: "/", target: "a", title: "Stop A", body: "About A" },
  { path: "/", target: "missing", title: "Stop M", body: "Not on the page" },
  { path: "/", target: "empty", title: "Stop E", body: "About E", example: <p>Sample E</p> },
  { path: "/", target: "b", title: "Stop B", body: "About B" },
  { path: "/other", target: "c", title: "Stop C", body: "About C" },
];

function Page(props: Partial<TourProps>) {
  return (
    <>
      <div data-tour="a">A</div>
      <div data-tour="b">B</div>
      <Tour stops={stops} path="/" navigate={() => {}} onSeen={() => {}} {...props} />
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });
const heading = (name: string) => screen.getByRole("heading", { name });

afterEach(cleanup);

describe("Tour", () => {
  it("opens with a welcome card counting the stops it will show", () => {
    render(<Page />);
    expect(screen.getByRole("dialog", { name: "Welcome to Keeping Tabs on Subs" })).toBeTruthy();
    // a, empty (example), b, c (other page); missing is skipped.
    expect(screen.getByText(/4 short stops/)).toBeTruthy();
    expect(screen.queryByTestId("tour-highlight")).toBeNull();
  });

  it("highlights stops, shows the example for a missing target, and goes Back", async () => {
    render(<Page />);
    fireEvent.click(button("Show me"));
    expect(heading("Stop A")).toBeTruthy();
    expect(screen.getByText("1 of 4")).toBeTruthy();
    expect(await screen.findByTestId("tour-highlight")).toBeTruthy();
    fireEvent.click(button("Next"));
    expect(heading("Stop E")).toBeTruthy();
    expect(screen.getByText("Sample E")).toBeTruthy();
    expect(screen.getByText(/Nothing here right now/)).toBeTruthy();
    expect(screen.queryByTestId("tour-highlight")).toBeNull();
    fireEvent.click(button("Next"));
    expect(heading("Stop B")).toBeTruthy();
    expect(screen.queryByText("Sample E")).toBeNull();
    fireEvent.click(button("Back"));
    expect(heading("Stop E")).toBeTruthy();
  });

  it("moves to another page for a stop there, and records the tour as seen on Show me", () => {
    const navigate = vi.fn();
    const onSeen = vi.fn();
    render(<Page navigate={navigate} onSeen={onSeen} start="b" />);
    expect(heading("Stop B")).toBeTruthy();
    fireEvent.click(button("Next"));
    expect(navigate).toHaveBeenCalledWith("/other?tour=c");
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();

    render(<Page onSeen={onSeen} />);
    fireEvent.click(button("Show me"));
    expect(onSeen).toHaveBeenCalledOnce();
  });

  it("opens at a stop from another page and finishes with Done", () => {
    const onSeen = vi.fn();
    const onClose = vi.fn();
    render(
      <>
        <div data-tour="c">C</div>
        <Tour stops={stops} path="/other" start="c" navigate={() => {}} onSeen={onSeen} onClose={onClose} />
      </>,
    );
    expect(heading("Stop C")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();
    fireEvent.click(button("Done"));
    expect(onSeen).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes and records on Skip and on Escape", () => {
    const onSkip = vi.fn();
    render(<Page onSeen={onSkip} />);
    fireEvent.click(button("Skip tour"));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();

    const onEsc = vi.fn();
    render(<Page onSeen={onEsc} />);
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onEsc).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("focuses the main button", () => {
    render(<Page />);
    expect(document.activeElement).toBe(button("Show me"));
    fireEvent.click(button("Show me"));
    expect(document.activeElement).toBe(button("Next"));
  });
});

describe("APP_TOUR", () => {
  it("never skips a list stop: each has an example or an element that is always there", () => {
    const always = new Set(["new"]);
    for (const s of APP_TOUR.filter((s) => s.path === "/")) {
      expect(s.example !== undefined || always.has(s.target), s.target).toBe(true);
    }
  });

  it("ends on Settings with email vs app and Keep quietly", () => {
    const settings = APP_TOUR.filter((s) => s.path === "/settings").map((s) => s.target);
    expect(settings).toEqual(["alert-channel", "reminder-days", "quiet-note"]);
  });
});
