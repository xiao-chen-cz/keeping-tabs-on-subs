// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cancelBy, defaultNoticeDays, effectiveNotice } from "./notice";

describe("notice", () => {
  it("defaults by cycle, 7 for unknown", () => {
    expect(defaultNoticeDays("monthly")).toBe(3);
    expect(defaultNoticeDays("every_4_weeks")).toBe(3);
    expect(defaultNoticeDays("quarterly")).toBe(7);
    expect(defaultNoticeDays("every_6_months")).toBe(7);
    expect(defaultNoticeDays("yearly")).toBe(7);
    expect(defaultNoticeDays(null)).toBe(7);
  });
  it("override wins, including 0", () => {
    expect(effectiveNotice({ cancelNoticeDays: 30, billingCycle: "monthly" })).toBe(30);
    expect(effectiveNotice({ cancelNoticeDays: 0, billingCycle: "yearly" })).toBe(0);
    expect(effectiveNotice({ cancelNoticeDays: null, billingCycle: "monthly" })).toBe(3);
  });
  it("cancel-by is next minus notice", () => {
    expect(cancelBy("2026-10-01", 3)).toBe("2026-09-28");
    expect(cancelBy(null, 3)).toBeNull();
  });
});
