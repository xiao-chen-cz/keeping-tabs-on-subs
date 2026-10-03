import { describe, expect, it } from "vitest";
import { formatDay, formatDayLong, relativeDays } from "./format";

describe("format", () => {
  it("formats days without time zone shifts", () => {
    expect(formatDay("2026-10-05")).toBe("5 Oct");
    expect(formatDay("2026-01-01")).toBe("1 Jan");
    expect(formatDayLong("2026-12-31")).toBe("31 Dec 2026");
  });
  it("describes relative days", () => {
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(1)).toBe("tomorrow");
    expect(relativeDays(3)).toBe("in 3 days");
    expect(relativeDays(-1)).toBe("yesterday");
    expect(relativeDays(-4)).toBe("4 days ago");
  });
});
