"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

export interface TourStop {
  /** Page the stop is on. The tour moves there (with `?tour=<target>`) when it reaches the stop. */
  path: string;
  /** Matches a `data-tour` attribute on that page. */
  target: string;
  title: string;
  body: string;
  /** Shown in the card when the target is not on the page (nothing due, nothing to check), or always with `exampleAlways`. */
  example?: ReactNode;
  exampleAlways?: boolean;
}

function Example({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-control border border-dashed border-line p-2">
      <p className="section-label mb-1">Example</p>
      <div aria-hidden>{children}</div>
    </div>
  );
}

const fakeButton = "inline-flex min-h-8 items-center rounded-control border border-line bg-surface px-3 text-sm font-medium";

/** Stops on the list, then on Settings. Copy is plain and short on purpose; sample names are from the fictional seed. */
export const APP_TOUR: TourStop[] = [
  {
    path: "/",
    target: "first-row",
    title: "Next renewal first",
    body: "Each line shows what the next payment costs, when it renews, and the cancel-by date: the last day you can cancel without paying again. The app works it out for you.",
    example: (
      <Example>
        <p className="font-semibold">CodePilot Pro</p>
        <p className="text-sm text-mid">$20.00 · renews in 27 days · cancel by in 24 days</p>
      </Example>
    ),
  },
  {
    path: "/",
    target: "due-soon",
    title: "Due soon",
    body: "When a cancel-by date is close, the subscription moves up here. Tap Keep to let it renew, or Cancelled once you have cancelled it. If you do nothing, it renews.",
    example: (
      <Example>
        <div className="rounded-control border-l-4 border-accent bg-accent-light p-2">
          <p className="section-label">Due soon · 1</p>
          <p className="mt-1 font-semibold">
            The Daily Ledger <span className="pill border-accent-dark/30 bg-accent-light text-accent-dark">in 3 days</span>
          </p>
          <p className="text-sm text-mid">€2.00 · cancel by in 3 days</p>
          <div className="mt-1.5 flex gap-2">
            <span className={fakeButton}>Keep</span>
            <span className={fakeButton}>Cancelled</span>
          </div>
        </div>
      </Example>
    ),
  },
  {
    path: "/",
    target: "inbox",
    title: "New entries to check",
    body: "Subscriptions the app has read but you have not approved yet show up here. Nothing goes into your list until you approve it.",
    example: (
      <Example>
        <p className="font-semibold">1 new entry to check</p>
        <p className="text-sm text-mid">Not in your list yet</p>
      </Example>
    ),
  },
  {
    path: "/",
    target: "new",
    title: "Add a subscription",
    body: "Describe it in a few words, upload a screenshot or PDF, or paste an email. The app reads it and asks you to check the result.",
  },
  {
    path: "/settings",
    target: "alert-channel",
    title: "Email or app only",
    body: "Settings is under the ☰ menu. Alerts always show in the app under Due soon. Choose whether they also come by email, at most one a day.",
  },
  {
    path: "/settings",
    target: "reminder-days",
    title: "When you are reminded",
    body: "Pick how many days before the cancel-by date you hear about a renewal. Tap Keep and the rest stay silent until the next renewal.",
  },
  {
    path: "/settings",
    target: "quiet-note",
    title: "Fewer reminders: Keep quietly",
    body: "For subscriptions you always keep, open one and choose Keep quietly under Reminders. Monthly ones then get no routine reminders, quarterly and yearly ones just one. Price rises and trials still alert you.",
    exampleAlways: true,
    example: (
      <Example>
        <p className="section-label">Reminders</p>
        <p className="mt-1 flex items-center gap-2 text-sm">
          <span className="size-3.5 rounded-full border border-mid" /> Remind me
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm font-medium">
          <span className="size-3.5 rounded-full border-4 border-primary" /> Keep quietly
        </p>
      </Example>
    ),
  },
];

const PAD = 6;
const noSubscribe = () => () => {};

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function find(target: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface TourProps {
  stops: TourStop[];
  /** Current page path; stops on other pages are reached through `navigate`. */
  path: string;
  /** A stop's target to open at (arriving from another page). Omit to start with the welcome card. */
  start?: string;
  navigate: (href: string) => void;
  /** Called when the tour is started, skipped or finished (record it as seen; repeat calls are fine). */
  onSeen: () => void | Promise<void>;
  /** Called when the tour closes (Done, Skip, Esc). */
  onClose?: () => void;
}

/**
 * Tour: a welcome card, then one highlighted element per stop with a short explanation. A stop whose
 * element is missing shows its example instead (or is skipped without one). The card sits at the bottom
 * of the screen, or the top when the highlight is low, so it never covers it. The page cannot be tapped meanwhile.
 */
export function Tour({ stops, path, start, navigate, onSeen, onClose }: TourProps) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Targets on this page, read after hydration (null on the server, so nothing renders there).
  const present = useSyncExternalStore(
    noSubscribe,
    () => stops.filter((s) => s.path === path && find(s.target) !== null).map((s) => s.target).join(" "),
    () => null,
  );
  const shown = useMemo(
    () =>
      present === null
        ? null
        : stops.filter((s) => s.path !== path || s.example !== undefined || present.split(" ").includes(s.target)),
    [present, stops, path],
  );
  // -1 is the welcome card.
  const index = picked ?? (shown && start ? shown.findIndex((s) => s.target === start) : -1);
  const stop = index >= 0 ? shown?.[index] : undefined;
  const hasTarget = stop !== undefined && present !== null && present.split(" ").includes(stop.target);

  const close = useCallback(() => {
    setOpen(false);
    void onSeen();
    onClose?.();
  }, [onSeen, onClose]);

  const go = useCallback(
    (next: number) => {
      if (index === -1) void onSeen();
      const s = shown?.[next];
      if (s && s.path !== path) {
        setOpen(false);
        navigate(`${s.path}?tour=${s.target}`);
        return;
      }
      setPicked(next);
    },
    [shown, index, path, navigate, onSeen],
  );

  const measure = useCallback(() => {
    const el = hasTarget ? find(stop.target) : null;
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [stop, hasTarget]);

  useEffect(() => {
    if (!open) return;
    const el = hasTarget ? find(stop.target) : null;
    el?.scrollIntoView?.({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const frame = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, stop, hasTarget, measure]);

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, index, shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || shown === null) return null;

  const last = index === shown.length - 1;
  const highlight = hasTarget ? box : null;
  const atTop = highlight !== null && highlight.top + highlight.height / 2 > window.innerHeight * 0.55;
  const showExample = stop?.example !== undefined && (stop.exampleAlways === true || !hasTarget);
  const title = stop ? stop.title : "Welcome to Keeping Tabs on Subs";
  const body = stop
    ? `${showExample && !stop.exampleAlways ? "Nothing here right now, so this is what it looks like. " : ""}${stop.body}`
    : `${shown.length > 0 ? `A quick look around in ${shown.length} short stops. ` : ""}Everything in your list is made up, so tap around freely.`;

  return (
    <div className="fixed inset-0 z-50">
      {/* Blocks taps on the page. Dims everything when nothing is highlighted. */}
      <div className={`absolute inset-0 ${highlight ? "" : "bg-black/50"}`} />
      {highlight && (
        <div
          aria-hidden
          data-testid="tour-highlight"
          className="pointer-events-none absolute rounded-control ring-2 ring-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all duration-200 motion-reduce:transition-none"
          style={{ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height }}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className={`absolute inset-x-0 mx-auto w-full max-w-md px-3 ${atTop ? "top-3" : "bottom-3"}`}
      >
        <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-control border border-line bg-surface p-4 shadow-lg">
          {stop && (
            <p className="section-label">
              {index + 1} of {shown.length}
            </p>
          )}
          <h2 id="tour-title" className="mt-0.5 font-heading text-lg font-semibold text-primary-ink">
            {title}
          </h2>
          <p id="tour-body" className="mt-1 text-[15px]">
            {body}
          </p>
          {showExample && stop.example}
          <div className="mt-3 flex items-center gap-2">
            {!last && (
              <button type="button" onClick={close} className="link min-h-10 px-1 text-sm">
                Skip tour
              </button>
            )}
            <span className="flex-1" />
            {index > 0 && (
              <button type="button" onClick={() => go(index - 1)} className="btn-secondary min-h-10 px-4 text-sm">
                Back
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={() => (last ? close() : go(index + 1))}
              className="btn-primary min-h-10 px-4 text-sm"
            >
              {last ? "Done" : index === -1 ? "Show me" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The app tour on the list and Settings pages. `start` is the `?tour=` value: a stop's target, or anything
 * else (`1`) for the welcome card. Recorded as seen on Show me, Skip, Esc or Done; `?tour` is dropped on close.
 */
export function AppTour({ start, markSeen }: { start?: string; markSeen: () => Promise<void> }) {
  const path = usePathname();
  const router = useRouter();
  const onClose = useCallback(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("tour")) {
      url.searchParams.delete("tour");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);
  return <Tour stops={APP_TOUR} path={path} start={start} navigate={router.push} onSeen={markSeen} onClose={onClose} />;
}
