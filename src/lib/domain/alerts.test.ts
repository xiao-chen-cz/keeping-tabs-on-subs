// @vitest-environment node
// logic-spec §3.2 and §5 E28-E33.
import { describe, expect, it } from "vitest";
import { alertsToSend, checkKeep, dueAlert, dueSoon, shouldOfferQuiet } from "./alerts";
import { computeSubscription } from "./compute";
import { core } from "./fixtures";
import type { PlainDate, SubscriptionCore } from "./types";

const OFFSETS = [3, 1, 0];
// Monthly, last 2026-09-07 -> next 2026-10-07, notice 3 -> cancel-by 2026-10-04.
const base: Partial<SubscriptionCore> = {
  amountCents: 1000,
  currency: "EUR",
  billingCycle: "monthly",
  lastRenewalDate: "2026-09-07",
};
type Over = Partial<SubscriptionCore> & { keptForCancelBy?: PlainDate | null };
const at = (today: PlainDate, over: Over = {}) => {
  const { keptForCancelBy, ...rest } = over;
  return computeSubscription({ ...core({ ...base, ...rest }), keptForCancelBy }, today);
};
const offsetOn = (today: PlainDate, over: Over = {}) => dueAlert(at(today, over), OFFSETS)?.offset ?? null;

describe("alerts", () => {
  it("E28: alerts at 3, 1, 0 days before cancel-by 2026-10-04", () => {
    expect(at("2026-10-01").computed.cancelBy).toBe("2026-10-04");
    expect(offsetOn("2026-09-30")).toBeNull(); // L=4
    expect(offsetOn("2026-10-01")).toBe(3);
    expect(offsetOn("2026-10-02")).toBe(3); // L=2 reaches only offset 3
    expect(offsetOn("2026-10-03")).toBe(1);
    expect(offsetOn("2026-10-04")).toBe(0);
    expect(offsetOn("2026-10-05")).toBeNull(); // L=-1
  });

  it("E28: email job sends each offset once", () => {
    expect(alertsToSend(at("2026-10-01"), OFFSETS, [])).toBe(3);
    expect(alertsToSend(at("2026-10-02"), OFFSETS, [3])).toBeNull();
    expect(alertsToSend(at("2026-10-03"), OFFSETS, [3])).toBe(1);
    expect(alertsToSend(at("2026-10-04"), OFFSETS, [3, 1])).toBe(0);
    expect(alertsToSend(at("2026-10-04"), OFFSETS, [3, 1, 0])).toBeNull();
  });

  it("E29: Keep silences this renewal; the next cycle's alerts resume", () => {
    const kept = { keptForCancelBy: "2026-10-04" };
    expect(offsetOn("2026-10-01", kept)).toBeNull();
    expect(offsetOn("2026-10-04", kept)).toBeNull();
    expect(alertsToSend(at("2026-10-03", kept), OFFSETS, [])).toBeNull();
    // After the renewal the cancel-by is 2026-11-04 (a different date): alerts resume.
    expect(at("2026-11-02", kept).computed.cancelBy).toBe("2026-11-04");
    expect(offsetOn("2026-11-02", kept)).toBe(3);
  });

  it("E30: row added late (L=2) gives one alert, not three", () => {
    const row = at("2026-10-02");
    expect(dueAlert(row, OFFSETS)?.offset).toBe(3);
    expect(dueSoon([row], OFFSETS)).toHaveLength(1);
    expect(alertsToSend(row, OFFSETS, [])).toBe(3);
    // L=0 with nothing sent yet: only the smallest reached offset.
    expect(alertsToSend(at("2026-10-04"), OFFSETS, [])).toBe(0);
  });

  it("E31: deadline passed (L=-1) gives no alert; row stays upcoming", () => {
    const row = at("2026-10-05");
    expect(row.computed.daysUntilCancelBy).toBe(-1);
    expect(dueAlert(row, OFFSETS)).toBeNull();
    expect(alertsToSend(row, OFFSETS, [])).toBeNull();
  });

  it("E32: cancel-by moves after Keep: Keep invalid, alerts start again", () => {
    // Kept for 2026-10-04; a 10-day notice... plan change moves cancel-by to 2026-10-11.
    const row = at("2026-10-09", { keptForCancelBy: "2026-10-04", lastRenewalDate: "2026-09-14" });
    expect(row.computed.cancelBy).toBe("2026-10-11");
    expect(dueAlert(row, OFFSETS)?.offset).toBe(3);
  });

  it("E33: price rise rides in the same single alert", () => {
    const row = at("2026-10-01", { amountCents: 12000, regularPriceCents: 20000, promoEnds: "2026-09-30" });
    expect(dueAlert(row, OFFSETS)).toEqual({
      offset: 3,
      cancelBy: "2026-10-04",
      daysLeft: 3,
      priceRise: { fromCents: 12000, toCents: 20000 },
    });
    expect(dueAlert(at("2026-10-01"), OFFSETS)?.priceRise).toBeNull();
  });

  it("not eligible: cancelled, Needs update, no cancel-by", () => {
    expect(offsetOn("2026-10-01", { status: "cancelled", accessUntil: "2026-10-20" })).toBeNull();
    expect(dueAlert(computeSubscription(core({ name: "Missing" }), "2026-10-01"), OFFSETS)).toBeNull();
  });

  it("active trial alerts on the trial end like any renewal", () => {
    const row = at("2026-10-01", { lastRenewalDate: null, trialEnds: "2026-10-07" });
    expect(row.computed.tags.trial).toBe(true);
    expect(dueAlert(row, OFFSETS)?.offset).toBe(3);
  });

  it("dueSoon sorts by days left, then name, and skips rows above every offset", () => {
    const rows = [
      at("2026-10-01", { name: "Zed" }),
      at("2026-10-01", { name: "Alpha" }),
      at("2026-10-01", { name: "Soon", lastRenewalDate: "2026-09-04" }), // cancel-by 1 Oct, L=0
      at("2026-10-01", { name: "Far", lastRenewalDate: "2026-09-17" }), // L=10
    ];
    expect(dueSoon(rows, OFFSETS).map((d) => d.row.input.name)).toEqual(["Soon", "Alpha", "Zed"]);
  });
});

describe("checkKeep", () => {
  it("accepts the row's current cancel-by", () => {
    expect(checkKeep(at("2026-10-01"), "2026-10-04")).toBe("ok");
  });
  it("E47: refuses a cancel-by that no longer matches", () => {
    // Plan change moved the anchor: cancel-by is now 2026-10-11.
    expect(checkKeep(at("2026-10-01", { lastRenewalDate: "2026-09-14" }), "2026-10-04")).toBe("stale");
  });
  it("refuses a cancelled row", () => {
    expect(checkKeep(at("2026-10-01", { status: "cancelled" }), "2026-10-04")).toBe("not_active");
  });
});

describe("shouldOfferQuiet (E44)", () => {
  const remind = { alertMode: "remind" as const, quietOfferShownAt: null };
  it("not after the first Keep", () => expect(shouldOfferQuiet(remind, 1)).toBe(false));
  it("after the second Keep", () => expect(shouldOfferQuiet(remind, 2)).toBe(true));
  it("never again once shown", () =>
    expect(shouldOfferQuiet({ ...remind, quietOfferShownAt: "2026-10-01T07:00:00Z" }, 3)).toBe(false));
  it("not for a row that is already quiet", () =>
    expect(shouldOfferQuiet({ alertMode: "quiet", quietOfferShownAt: null }, 2)).toBe(false));
});
