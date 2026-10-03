// @vitest-environment node
import { describe, expect, it } from "vitest";
import { calc } from "./fixtures";
import type { SubscriptionCore } from "./types";
import { groupAndSort } from "./upcoming";

const T = "2026-10-02";
const monthly = (name: string, f: string, over: Partial<SubscriptionCore> = {}) =>
  calc({ name, billingCycle: "monthly", lastRenewalDate: f, ...over }, T);

describe("groupAndSort", () => {
  it("sorts by cancel-by, then next renewal (different notice), then name case-insensitively", () => {
    const rows = [
      monthly("zeta", "2026-09-15"),
      monthly("Alpha", "2026-09-15"),
      monthly("beta", "2026-09-15"),
      monthly("Early", "2026-09-10"), // 10-10, cancel-by 10-07
      // same cancel-by 10-12 as the 15th rows, but next renewal 10-17 (notice 5), so after them
      monthly("Long notice", "2026-09-17", { cancelNoticeDays: 5 }),
    ];
    expect(groupAndSort(rows).upcoming.map((r) => r.input.name)).toEqual([
      "Early", "Alpha", "beta", "zeta", "Long notice",
    ]);
  });
  it("puts Needs update first, ahead of earlier cancel-by", () => {
    const rows = [monthly("Soon", "2026-09-03"), calc({ name: "NoDates" }, T)];
    expect(groupAndSort(rows).upcoming.map((r) => r.input.name)).toEqual(["NoDates", "Soon"]);
  });
  it("splits cancelled into ending (by access date) and archived", () => {
    const c = (name: string, accessUntil: string | null) => calc({ name, status: "cancelled", accessUntil }, T);
    const g = groupAndSort([c("B", "2026-12-31"), c("A", "2026-11-01"), c("Old", "2026-09-30"), c("None", null), monthly("Live", "2026-09-15")]);
    expect(g.ending.map((r) => r.input.name)).toEqual(["A", "B"]);
    expect(g.archived.map((r) => r.input.name)).toEqual(["None", "Old"]);
    expect(g.upcoming.map((r) => r.input.name)).toEqual(["Live"]);
  });
});
