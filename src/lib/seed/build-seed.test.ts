// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addDays, diffDays } from "@/lib/dates/plain-date";
import { computeSubscription } from "@/lib/domain/compute";
import { groupAndSort } from "@/lib/domain/upcoming";
import { formatMoney, totalsByCurrency } from "@/lib/domain/totals";
import type { PlainDate } from "@/lib/domain/types";
import { buildSeed, type SeedRow, type SeedSet } from "./build-seed";

function view(set: SeedSet, today: PlainDate) {
  const rows = buildSeed(set, today).map((r) => computeSubscription(r, today));
  const byName = (name: string) => {
    const r = rows.find((x) => x.input.name === name);
    if (!r) throw new Error(`missing ${name}`);
    return r;
  };
  return { rows, byName, groups: groupAndSort(rows), totals: totalsByCurrency(rows) };
}
const names = (rs: { input: { name: string } }[]) => rs.map((r) => r.input.name);
const money = (t: ReturnType<typeof totalsByCurrency>, cur: "EUR" | "USD") => [
  formatMoney(t[cur]?.monthly ?? 0, cur),
  formatMoney(t[cur]?.yearly ?? 0, cur),
];

describe("tier 1: snapshot at 2026-10-02 (seed-data.md answer key)", () => {
  const T = "2026-10-02";

  it("starter set: order, alerts, totals", () => {
    const v = view("starter", T);
    expect(names(v.groups.upcoming)).toEqual(["The Daily Ledger", "VoiceDraft Pro", "CodePilot Pro", "Notely Teams"]);
    expect(v.byName("The Daily Ledger").computed.daysUntilCancelBy).toBe(3);
    const vd = v.byName("VoiceDraft Pro");
    expect(vd.computed.daysUntilCancelBy).toBe(3);
    expect(vd.computed.priceRises).toBe(true);
    expect([vd.input.amountCents, vd.computed.renewalAmountCents]).toEqual([12000, 20000]);
    expect(v.byName("The Daily Ledger").computed.priceRises).toBe(false);
    expect(v.byName("CodePilot Pro").computed.daysUntilCancelBy).toBe(24);
    expect(v.byName("Notely Teams").computed.daysUntilCancelBy).toBe(165);
    expect(money(v.totals, "EUR")).toEqual(["€22.17", "€266.00"]);
    expect(money(v.totals, "USD")).toEqual(["$30.00", "$360.00"]);
  });

  it("full set: order, tags, totals", () => {
    const v = view("full", T);
    expect(v.rows).toHaveLength(13);
    const up = v.groups.upcoming;
    expect(names(up).slice(0, 5)).toEqual(["PixelStock", "ChatPal Plus", "BudgetBuddy", "The Daily Ledger", "VoiceDraft Pro"]);
    expect(up.slice(1, 5).map((r) => r.computed.daysUntilCancelBy)).toEqual([-2, 2, 3, 3]);
    expect(v.byName("PixelStock").computed.tags.needsUpdate).toBe(true);
    expect(names(v.rows.filter((r) => r.computed.tags.trial))).toEqual(["StreamBox Prime"]);
    expect(names(v.rows.filter((r) => r.computed.tags.needsUpdate))).toEqual(["PixelStock"]);
    expect(names(v.groups.ending)).toEqual(["FitClub Online"]);
    expect(v.groups.archived).toEqual([]);
    expect(names(up)).not.toContain("FitClub Online");
    expect(money(v.totals, "EUR")).toEqual(["€89.79", "€1,077.51"]);
    expect(money(v.totals, "USD")).toEqual(["$50.00", "$600.00"]);
  });

  it("gives the second CodePilot Pro (#13) its own account, +12 days, in the order after VoiceDraft Pro", () => {
    const v = view("full", T);
    const cp = v.rows.filter((r) => r.input.name === "CodePilot Pro");
    expect(cp.map((r) => r.input.accountLabel)).toEqual(["me@example.com", "work@example.com"]);
    expect(cp.map((r) => r.computed.daysUntilRenewal)).toEqual([27, 12]);
    expect(cp.map((r) => r.computed.daysUntilCancelBy)).toEqual([24, 9]);
    expect(v.rows.filter((r) => r.input.accountLabel !== null)).toHaveLength(2);
    expect(buildSeed("starter", T).filter((r) => r.accountLabel !== null)).toHaveLength(1);
    expect(buildSeed("starter", T)).toHaveLength(4);
  });

  it("derives the documented edge-row anchors", () => {
    const rows = buildSeed("full", T);
    const get = (k: number) => rows.find((r) => r.key === k) as SeedRow;
    expect(get(9).lastRenewalDate).toBe("2026-08-31"); // latest 31st on or before T
    expect(get(12).lastRenewalDate).toBe("2026-09-03"); // next 2026-10-03 minus one month
    expect(get(11).lastRenewalDate).toBe("2026-09-22"); // next 2026-10-22nus one month
  });
});

// Expected relative order of the 12 non-Cloudly rows (CodePilot Pro twice: #13 at +12, then #1 at +27) (derived from the offsets in seed-data.md).
const ORDER_WITHOUT_CLOUDLY = [
  "PixelStock", "ChatPal Plus", "BudgetBuddy", "The Daily Ledger", "VoiceDraft Pro", "CodePilot Pro", "StreamBox Prime",
  "EuroServer Hosting", "CodePilot Pro", "SafeHome Insurance", "Notely Teams",
];
const NEXT_OFFSETS: Record<string, number> = {
  "CodePilot Pro": 27, "Notely Teams": 195, "The Daily Ledger": 6, "VoiceDraft Pro": 10,
  "StreamBox Prime": 19, BudgetBuddy: 9, "SafeHome Insurance": 50, "EuroServer Hosting": 20, "ChatPal Plus": 1,
};

describe.each(["2026-10-31", "2027-02-28", "2028-02-29", "2027-01-01", "2026-12-31"])(
  "tier 2: invariants at today %s",
  (T) => {
    const v = view("full", T);
    const ref = view("full", "2026-10-02");

    it("every offset row lands on its documented offset", () => {
      for (const [name, offset] of Object.entries(NEXT_OFFSETS)) {
        expect(v.byName(name).computed.daysUntilRenewal, name).toBe(offset);
      }
      expect(v.byName("FitClub Online").input.accessUntil).toBe(addDays(T, 12));
      expect(v.byName("PixelStock").input.trialEnds).toBe(addDays(T, -5));
      expect(v.byName("VoiceDraft Pro").input.promoEnds).toBe(v.byName("VoiceDraft Pro").computed.nextRenewal);
      expect(v.byName("The Daily Ledger").input.promoEnds).toBe(addDays(T, 300));
      expect(v.byName("The Daily Ledger").computed.priceRises).toBe(false);
      expect(v.byName("VoiceDraft Pro").computed.priceRises).toBe(true);
    });

    it("puts Needs update first, and keeps Ending and archived out of upcoming", () => {
      expect(v.groups.upcoming[0]?.input.name).toBe("PixelStock");
      expect(names(v.groups.upcoming)).not.toContain("FitClub Online");
      expect(names(v.groups.ending)).toEqual(["FitClub Online"]);
      expect(v.groups.upcoming).toHaveLength(12);
    });

    it("keeps the 12 other rows in their documented relative order", () => {
      expect(names(v.groups.upcoming).filter((n) => n !== "Cloudly Storage")).toEqual(ORDER_WITHOUT_CLOUDLY);
    });

    it("leaves totals unchanged", () => {
      expect(v.totals).toEqual(ref.totals);
    });

    it("lands Cloudly on the last day of a short month", () => {
      const next = v.byName("Cloudly Storage").computed.nextRenewal as PlainDate;
      const [y, m, d] = next.split("-").map(Number) as [number, number, number];
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      expect(d).toBe(daysInMonth); // 31st in long months, month end in short ones
      expect(diffDays(next, T)).toBeGreaterThanOrEqual(0);
    });
  },
);

describe("anchor derivation", () => {
  it("never throws for any day of two years", () => {
    for (let i = 0; i < 730; i++) {
      const today = addDays("2026-01-01", i);
      for (const set of ["starter", "full"] as const) expect(() => buildSeed(set, today), today).not.toThrow();
    }
  });

  it("uses a future anchor only where the seed means one (BudgetBuddy, D4)", () => {
    for (let i = 0; i < 730; i++) {
      const today = addDays("2026-01-01", i);
      const future = buildSeed("full", today)
        .filter((r) => r.lastRenewalDate !== null && r.lastRenewalDate > today)
        .map((r) => r.name);
      expect(future, today).toEqual(["BudgetBuddy"]);
    }
  });
});

describe("Keep quietly in the full set (D13)", () => {
  it("BudgetBuddy and Cloudly Storage are quiet; the starter set has no quiet row", () => {
    expect(buildSeed("full", "2026-10-02").filter((s) => s.alertMode === "quiet").map((s) => s.name).sort())
      .toEqual(["BudgetBuddy", "Cloudly Storage"]);
    expect(buildSeed("starter", "2026-10-02").some((s) => s.alertMode === "quiet")).toBe(false);
  });
});
