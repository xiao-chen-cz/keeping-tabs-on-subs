// @vitest-environment node
// logic-spec §3.2 and §5 E28-E33.
import { describe, expect, it } from "vitest";
import { alertsToSend, checkKeep, describeReminders, dueAlert, dueSoon, shouldOfferQuiet } from "./alerts";
import { computeSubscription } from "./compute";
import { core } from "./fixtures";
import type { AlertMode, PlainDate, SubscriptionCore } from "./types";

const OFFSETS = [3, 1, 0];
// Monthly, last 2026-09-07 -> next 2026-10-07, notice 3 -> cancel-by 2026-10-04.
const base: Partial<SubscriptionCore> = {
  amountCents: 1000,
  currency: "EUR",
  billingCycle: "monthly",
  lastRenewalDate: "2026-09-07",
};
type Over = Partial<SubscriptionCore> & { keptForCancelBy?: PlainDate | null; alertMode?: AlertMode };
const at = (today: PlainDate, over: Over = {}) => {
  const { keptForCancelBy, alertMode, ...rest } = over;
  return computeSubscription({ ...core({ ...base, ...rest }), keptForCancelBy, alertMode }, today);
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

describe("Keep quietly (D13)", () => {
  const quiet = { alertMode: "quiet" as const };
  // Yearly, last 2025-10-11 -> next 2026-10-11, notice 7 -> cancel-by 2026-10-04 (same as the monthly base).
  const yearly = { ...quiet, billingCycle: "yearly" as const, lastRenewalDate: "2025-10-11" };

  it("E38: quiet monthly without a price rise never alerts", () => {
    for (const d of ["2026-10-01", "2026-10-03", "2026-10-04"]) expect(offsetOn(d, quiet)).toBeNull();
  });
  it("E39: quiet monthly with a price rise alerts at every offset, with the price", () => {
    const rise = { ...quiet, amountCents: 1000, regularPriceCents: 1500, promoEnds: "2026-10-07" };
    expect([offsetOn("2026-10-01", rise), offsetOn("2026-10-03", rise), offsetOn("2026-10-04", rise)]).toEqual([3, 1, 0]);
    expect(dueAlert(at("2026-10-01", rise), OFFSETS)?.priceRise).toEqual({ fromCents: 1000, toCents: 1500 });
  });
  it("E40: quiet yearly alerts once, at the largest offset", () => {
    expect(at("2026-10-01", yearly).computed.cancelBy).toBe("2026-10-04");
    expect([offsetOn("2026-10-01", yearly), offsetOn("2026-10-03", yearly), offsetOn("2026-10-04", yearly)]).toEqual([3, 3, 3]);
    const row = at("2026-10-03", yearly);
    expect(alertsToSend(row, OFFSETS, [3])).toBeNull(); // already sent on 10-01: nothing more by email
  });
  it("E41: quiet yearly added late still gets its one alert", () => {
    expect(alertsToSend(at("2026-10-03", yearly), OFFSETS, [])).toBe(3);
  });
  it("E48: quiet yearly with offsets 7, 3 alerts only at 7", () => {
    expect(dueAlert(at("2026-09-27", yearly), [7, 3])?.offset).toBe(7);
    expect(alertsToSend(at("2026-10-01", yearly), [7, 3], [7])).toBeNull();
  });
  it("quiet quarterly counts as a long cycle", () => {
    expect(offsetOn("2026-10-01", { ...quiet, billingCycle: "quarterly", lastRenewalDate: "2026-07-11" })).toBe(3);
  });
  it("quiet every 6 months counts as a long cycle", () => {
    expect(offsetOn("2026-10-01", { ...quiet, billingCycle: "every_6_months", lastRenewalDate: "2026-04-11" })).toBe(3);
  });
  it("E42: quiet during an active trial alerts like Remind", () => {
    const trial = { ...quiet, lastRenewalDate: null, trialEnds: "2026-10-07" };
    expect([offsetOn("2026-10-01", trial), offsetOn("2026-10-03", trial), offsetOn("2026-10-04", trial)]).toEqual([3, 1, 0]);
  });
  it("E43: quiet does not hide Needs update", () => {
    const row = at("2026-10-01", { ...quiet, lastRenewalDate: null, billingCycle: null });
    expect(row.computed.tags.needsUpdate).toBe(true);
  });
  it("Remind (and a missing mode) keeps every offset", () => {
    expect(offsetOn("2026-10-03", { alertMode: "remind" })).toBe(1);
    expect(offsetOn("2026-10-03")).toBe(1);
  });
});

describe("describeReminders", () => {
  it("summarises each mode by cycle", () => {
    expect(describeReminders("remind", "monthly", [3, 1, 0])).toBe("Reminders 3, 1 and 0 days before the cancel-by.");
    expect(describeReminders("quiet", "yearly", [3, 1, 0])).toBe("One reminder, 3 days before the cancel-by.");
    expect(describeReminders("quiet", "quarterly", [7, 3])).toBe("One reminder, 7 days before the cancel-by.");
    expect(describeReminders("quiet", "every_6_months", [3, 1, 0])).toBe("One reminder, 3 days before the cancel-by.");
    expect(describeReminders("quiet", "every_4_weeks", [3, 1, 0])).toBe("No routine reminders.");
    expect(describeReminders("remind", "monthly", [3])).toBe("Reminders 3 days before the cancel-by.");
  });
});
