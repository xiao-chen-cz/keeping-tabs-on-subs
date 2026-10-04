// @vitest-environment node
// logic-spec §5, one named test per case. Default today 2026-10-01. E28-E33 (alerts) belong to D21-23.
import { describe, expect, it } from "vitest";
import { calc } from "./fixtures";
import { parseSubscriptionForm } from "@/lib/validation/subscription-form";
import { parseBillingCycle } from "./schedule";
import { formatMoney, totalsByCurrency } from "./totals";
import type { PlainDate, SubscriptionCore } from "./types";
import { groupAndSort } from "./upcoming";

const T0 = "2026-10-01";

interface Expect {
  next: PlainDate | null;
  days?: number | null;
  notice?: number;
  cancelBy?: PlainDate | null;
  daysCancelBy?: number | null;
  renewal?: number | null;
  rises?: boolean | null;
  trial?: boolean;
  needsUpdate?: boolean;
}

interface Row {
  id: string;
  input: Partial<SubscriptionCore>;
  today?: PlainDate;
  expect: Expect;
}

const m = (f: string, over: Partial<SubscriptionCore> = {}): Partial<SubscriptionCore> => ({
  billingCycle: "monthly",
  lastRenewalDate: f,
  ...over,
});

const rows: Row[] = [
  { id: "E1", input: m("2026-09-15"), expect: { next: "2026-10-15", days: 14, notice: 3, cancelBy: "2026-10-12", daysCancelBy: 11 } },
  { id: "E2", input: m("2026-08-01"), expect: { next: "2026-10-01", days: 0, notice: 3, cancelBy: "2026-09-28", daysCancelBy: -3 } },
  { id: "E2b", input: m("2026-08-01"), today: "2026-10-02", expect: { next: "2026-11-01", days: 30 } },
  { id: "E3", input: m("2026-01-31"), today: "2026-02-15", expect: { next: "2026-02-28" } },
  { id: "E4", input: m("2026-01-31"), today: "2026-03-01", expect: { next: "2026-03-31" } },
  { id: "E5", input: m("2026-01-31"), today: "2026-02-28", expect: { next: "2026-02-28", days: 0 } },
  { id: "E5b", input: { billingCycle: "yearly", lastRenewalDate: "2024-02-29" }, today: "2025-02-28", expect: { next: "2025-02-28", days: 0 } },
  { id: "E6", input: { billingCycle: "yearly", lastRenewalDate: "2024-02-29" }, expect: { next: "2027-02-28" } },
  { id: "E7", input: { billingCycle: "yearly", lastRenewalDate: "2024-02-29" }, today: "2027-03-01", expect: { next: "2028-02-29" } },
  { id: "E8", input: { billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10" }, expect: { next: "2026-10-08", days: 7, notice: 3, cancelBy: "2026-10-05", daysCancelBy: 4 } },
  { id: "E9", input: { billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10" }, today: "2026-10-08", expect: { next: "2026-10-08", days: 0 } },
  { id: "E9b", input: m("2026-10-01"), expect: { next: "2026-10-01", days: 0 } },
  { id: "E10", input: { billingCycle: "yearly", amountCents: 2999, lastRenewalDate: "2026-10-11" }, today: "2026-10-02", expect: { next: "2026-10-11", days: 9, notice: 7, cancelBy: "2026-10-04", daysCancelBy: 2, renewal: 2999, rises: false, needsUpdate: false } },
  { id: "E10b", input: { billingCycle: "yearly", amountCents: 2999, lastRenewalDate: "2026-10-11" }, today: "2026-10-12", expect: { next: "2027-10-11", days: 364 } },
  { id: "E11", input: { billingCycle: "monthly", trialEnds: "2026-10-21" }, expect: { next: "2026-10-21", days: 20, notice: 3, cancelBy: "2026-10-18", daysCancelBy: 17, trial: true } },
  { id: "E12", input: { trialEnds: "2026-10-01" }, expect: { next: "2026-10-01", days: 0, notice: 7, cancelBy: "2026-09-24", daysCancelBy: -7, trial: true } },
  { id: "E13", input: { trialEnds: "2026-09-30" }, expect: { next: null, days: null, cancelBy: null, daysCancelBy: null, needsUpdate: true, trial: false } },
  { id: "E14", input: m("2026-10-21", { trialEnds: "2026-10-21" }), today: "2026-11-05", expect: { next: "2026-11-21", notice: 3, trial: false } },
  { id: "E15", input: {}, expect: { next: null, days: null, cancelBy: null, daysCancelBy: null, needsUpdate: true } },
  { id: "E15b", input: { billingCycle: "monthly" }, expect: { next: null, needsUpdate: true } },
  { id: "E16b", input: { billingCycle: "quarterly", lastRenewalDate: "2026-08-15" }, expect: { next: "2026-11-15", notice: 7, cancelBy: "2026-11-08" } },
  { id: "E17", input: m("2026-09-02"), expect: { next: "2026-10-02", days: 1, cancelBy: "2026-09-29", daysCancelBy: -2 } },
  // Promo cases: yearly anchored 2026-06-06 gives next 2027-06-06 (E18); every-4-weeks anchored 2026-09-10 gives 2026-10-08.
  { id: "E18", input: { billingCycle: "yearly", lastRenewalDate: "2026-06-06", amountCents: 12000, regularPriceCents: 20000, promoEnds: "2027-06-06" }, expect: { next: "2027-06-06", renewal: 20000, rises: true } },
  { id: "E19", input: { billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10", amountCents: 200, regularPriceCents: 1200, promoEnds: "2027-09-09" }, expect: { next: "2026-10-08", renewal: 200, rises: false } },
  { id: "E20", input: { billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10", amountCents: 200, regularPriceCents: 1200, promoEnds: "2026-10-09" }, expect: { next: "2026-10-08", renewal: 200, rises: false } },
  { id: "E21", input: { billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10", amountCents: 2000, regularPriceCents: 1000, promoEnds: "2026-10-08" }, expect: { next: "2026-10-08", renewal: 1000, rises: false } },
  { id: "E22", input: m("2026-09-15", { amountCents: 100, regularPriceCents: 1200 }), expect: { next: "2026-10-15", renewal: 100, rises: false } },
  { id: "E22b", input: m("2026-09-15", { amountCents: 100, promoEnds: "2026-01-01" }), expect: { next: "2026-10-15", renewal: 100, rises: false } },
  { id: "E23", input: { billingCycle: "every_4_weeks", lastRenewalDate: "2026-09-10", amountCents: 200, regularPriceCents: 1200, promoEnds: "2027-09-09" }, today: "2027-10-01", expect: { next: "2027-10-07", renewal: 1200, rises: true } },
  { id: "E24", input: m("2026-09-15", { regularPriceCents: 500, promoEnds: "2026-01-01" }), expect: { next: "2026-10-15", renewal: null, rises: null } },
  { id: "E26", input: m("2026-09-15", { status: "cancelled", amountCents: 100 }), expect: { next: null, days: null, cancelBy: null, needsUpdate: false, trial: false } },
  { id: "E26b", input: { status: "cancelled", trialEnds: "2026-10-21" }, expect: { next: null, needsUpdate: false, trial: false } },
];

describe("logic-spec §5 edge cases", () => {
  it.each(rows)("$id", ({ input, today = T0, expect: e }) => {
    const { computed: c } = calc(input, today);
    expect(c.nextRenewal).toBe(e.next);
    if (e.days !== undefined) expect(c.daysUntilRenewal).toBe(e.days);
    if (e.notice !== undefined) expect(c.noticeDays).toBe(e.notice);
    if (e.cancelBy !== undefined) expect(c.cancelBy).toBe(e.cancelBy);
    if (e.daysCancelBy !== undefined) expect(c.daysUntilCancelBy).toBe(e.daysCancelBy);
    if (e.renewal !== undefined) expect(c.renewalAmountCents).toBe(e.renewal);
    if (e.rises !== undefined) expect(c.priceRises).toBe(e.rises);
    if (e.trial !== undefined) expect(c.tags.trial).toBe(e.trial);
    if (e.needsUpdate !== undefined) expect(c.tags.needsUpdate).toBe(e.needsUpdate);
  });

  it("E10 shows a plan starting later, E10b no longer", () => {
    const i = { billingCycle: "yearly", amountCents: 2999, lastRenewalDate: "2026-10-11" } as const;
    expect(calc(i, "2026-10-02").computed.anchorInFuture).toBe(true);
    expect(calc(i, "2026-10-12").computed.anchorInFuture).toBe(false);
    // A cancelled row with a future billing date still labels it as the next charge.
    expect(calc({ ...i, status: "cancelled" }, "2026-10-02").computed.anchorInFuture).toBe(true);
  });

  it("E11 notice default is flagged, an override is not", () => {
    expect(calc({ billingCycle: "monthly", trialEnds: "2026-10-21" }, T0).computed.noticeIsDefault).toBe(true);
    expect(calc({ billingCycle: "monthly", trialEnds: "2026-10-21", cancelNoticeDays: 5 }, T0).computed.noticeIsDefault).toBe(false);
  });

  it("E13 Needs update sorts to the top of Upcoming", () => {
    const rows = [calc(m("2026-09-02"), T0), calc({ name: "Ended trial", trialEnds: "2026-09-30" }, T0)];
    expect(groupAndSort(rows).upcoming[0]?.input.name).toBe("Ended trial");
  });

  it("E16 unknown cycle text is rejected, a row with it is Needs update", () => {
    for (const raw of ["Trial", "Biweekly"]) {
      const cycle = parseBillingCycle(raw);
      expect(cycle).toBeNull();
      const { computed } = calc({ billingCycle: cycle, lastRenewalDate: "2026-09-15" }, T0);
      expect(computed.nextRenewal).toBeNull();
      expect(computed.tags.needsUpdate).toBe(true);
    }
  });

  // The type requires a name and the DB check rejects an empty one (length(trim(name)) > 0),
  // so there is no empty-name row to compute. Validation lives in src/lib/validation and the schema.
  it("E25 empty name is rejected on entry (DB check enforces the same)", () => {
    expect(parseSubscriptionForm({ name: "  ", status: "confirmed" }, "edit").ok).toBe(false);
  });

  it("E27 EUR and USD stay separate", () => {
    const t = totalsByCurrency([
      calc({ amountCents: 1000, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-15" }, T0),
      calc({ amountCents: 2000, currency: "USD", billingCycle: "monthly", lastRenewalDate: "2026-09-15" }, T0),
    ]);
    expect(t).toEqual({ EUR: { monthly: 1000, yearly: 12000 }, USD: { monthly: 2000, yearly: 24000 } });
  });

  it("E34 cancelled with access: Ending, no renewal, not in totals", () => {
    const row = calc({ status: "cancelled", accessUntil: "2026-12-31", amountCents: 1490, currency: "EUR", billingCycle: "monthly" }, "2026-10-02");
    expect(row.computed.nextRenewal).toBeNull();
    expect(row.computed.tags).toEqual({ trial: false, needsUpdate: false, ending: true });
    expect(row.computed.archived).toBe(false);
    expect(groupAndSort([row]).ending).toHaveLength(1);
    expect(totalsByCurrency([row])).toEqual({});
  });

  it("E35 access ended: archive only", () => {
    const row = calc({ status: "cancelled", accessUntil: "2026-12-31" }, "2027-01-01");
    expect(row.computed.tags.ending).toBe(false);
    expect(row.computed.archived).toBe(true);
    const g = groupAndSort([row]);
    expect([g.upcoming.length, g.ending.length, g.archived.length]).toEqual([0, 0, 1]);
  });

  it("E36 totals: EUR 10 monthly + 10 yearly + 2 every 4 weeks", () => {
    const eur = (amountCents: number, billingCycle: SubscriptionCore["billingCycle"], f: string) =>
      calc({ amountCents, currency: "EUR", billingCycle, lastRenewalDate: f }, T0);
    const t = totalsByCurrency([eur(1000, "monthly", "2026-09-15"), eur(12000, "yearly", "2026-09-15"), eur(200, "every_4_weeks", "2026-09-10")]);
    expect(formatMoney(t.EUR?.monthly ?? 0, "EUR")).toBe("€22.17");
    expect(formatMoney(t.EUR?.yearly ?? 0, "EUR")).toBe("€266.00");
  });

  it("E37 an active trial is not counted; counted once the trial has ended", () => {
    const i = { amountCents: 899, currency: "EUR", billingCycle: "monthly", trialEnds: "2026-10-21", lastRenewalDate: "2026-10-21" } as const;
    expect(totalsByCurrency([calc(i, T0)])).toEqual({});
    expect(totalsByCurrency([calc(i, "2026-10-22")]).EUR?.monthly).toBe(899);
  });
});
