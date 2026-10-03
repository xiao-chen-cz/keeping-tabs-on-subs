// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  compare,
  diffDays,
  fromDayNumber,
  isPlainDate,
  toDayNumber,
  todayIn,
} from "./plain-date";

describe("plain-date", () => {
  it("validates real calendar dates only", () => {
    expect(isPlainDate("2026-10-01")).toBe(true);
    expect(isPlainDate("2026-02-30")).toBe(false);
    expect(isPlainDate("2026-2-3")).toBe(false);
    expect(isPlainDate(20261001)).toBe(false);
    expect(isPlainDate("2024-02-29")).toBe(true);
    expect(isPlainDate("2025-02-29")).toBe(false);
  });

  it("round-trips day numbers", () => {
    for (const d of ["1970-01-01", "2024-02-29", "2026-12-31"]) expect(fromDayNumber(toDayNumber(d))).toBe(d);
    expect(toDayNumber("1970-01-02")).toBe(1);
  });

  it("adds and diffs days across month and year ends", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-10-08", "2026-10-01")).toBe(7);
    expect(diffDays("2026-10-01", "2026-10-08")).toBe(-7);
    expect(compare("2026-10-01", "2026-10-02")).toBe(-1);
    expect(compare("2026-10-02", "2026-10-02")).toBe(0);
  });

  it("clamps months from the original anchor", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2026-01-31", 3)).toBe("2026-04-30");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsClamped("2024-02-29", 12)).toBe("2025-02-28");
    expect(addMonthsClamped("2024-02-29", 48)).toBe("2028-02-29");
    expect(addMonthsClamped("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonthsClamped("2026-01-15", -2)).toBe("2025-11-15");
  });

  it("todayIn uses the zone's calendar date", () => {
    expect(todayIn("Europe/Berlin", new Date("2026-10-01T22:30:00Z"))).toBe("2026-10-02");
    expect(todayIn("Europe/Berlin", new Date("2026-10-01T21:30:00Z"))).toBe("2026-10-01");
  });

  it("todayIn across DST switches", () => {
    // 2026-03-29 01:00Z the clocks go forward (CET to CEST): 00:30Z is 01:30 CET, same date
    expect(todayIn("Europe/Berlin", new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
    expect(todayIn("Europe/Berlin", new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
    // 2026-10-25 clocks go back: 00:30Z is 02:30 CEST
    expect(todayIn("Europe/Berlin", new Date("2026-10-25T00:30:00Z"))).toBe("2026-10-25");
    expect(todayIn("Europe/Berlin", new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(todayIn("Europe/Berlin", new Date("2026-10-24T21:30:00Z"))).toBe("2026-10-24");
  });
});
