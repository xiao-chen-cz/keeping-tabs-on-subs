// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseAlertSettings } from "./alert-settings";

describe("parseAlertSettings", () => {
  it("accepts a channel and keeps known offsets, largest first", () => {
    expect(parseAlertSettings("app", ["0", "3", "7"])).toEqual({ ok: true, alertChannel: "app", reminderOffsets: [7, 3, 0] });
  });
  it("drops unknown offsets", () => {
    expect(parseAlertSettings("app_email", ["3", "5", "abc"])).toEqual({ ok: true, alertChannel: "app_email", reminderOffsets: [3] });
  });
  it("needs at least one offset", () => {
    expect(parseAlertSettings("app_email", [])).toEqual({ ok: false, error: "Choose at least one reminder day." });
  });
  it("rejects an unknown channel", () => {
    expect(parseAlertSettings("sms", ["3"]).ok).toBe(false);
  });
});
