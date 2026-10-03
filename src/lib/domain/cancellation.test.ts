// @vitest-environment node
import { describe, expect, it } from "vitest";
import { looksLikeCardNumber, validateCancellation } from "./cancellation";

const TODAY = "2026-10-04";
const ok = { occurredOn: "2026-10-04", channel: "website_app", reference: null, note: null };

describe("validateCancellation", () => {
  it("accepts today, a past date and an optional reference", () => {
    const r = validateCancellation({ ...ok, reference: " ABC-123 ", note: " " }, TODAY);
    expect(r).toEqual({
      ok: true,
      value: { occurredOn: "2026-10-04", channel: "website_app", reference: "ABC-123", note: null },
    });
    expect(validateCancellation({ ...ok, occurredOn: "2026-09-01" }, TODAY).ok).toBe(true);
  });

  it("requires a channel and a date", () => {
    const r = validateCancellation({ occurredOn: null, channel: null, reference: null, note: null }, TODAY);
    expect(r).toMatchObject({ ok: false, errors: { occurredOn: expect.any(String), channel: expect.any(String) } });
    expect(validateCancellation({ ...ok, channel: "carrier pigeon" }, TODAY).ok).toBe(false);
  });

  it("rejects a future or invalid date", () => {
    expect(validateCancellation({ ...ok, occurredOn: "2026-10-05" }, TODAY)).toMatchObject({
      ok: false,
      errors: { occurredOn: "The date cannot be in the future" },
    });
    expect(validateCancellation({ ...ok, occurredOn: "2026-02-30" }, TODAY).ok).toBe(false);
  });

  it("limits the reference to 100 characters and rejects card-like numbers", () => {
    expect(validateCancellation({ ...ok, reference: "x".repeat(100) }, TODAY).ok).toBe(true);
    expect(validateCancellation({ ...ok, reference: "x".repeat(101) }, TODAY).ok).toBe(false);
    expect(validateCancellation({ ...ok, reference: "4111 1111 1111 1111" }, TODAY).ok).toBe(false);
    expect(validateCancellation({ ...ok, reference: "4111-1111-1111-1111" }, TODAY).ok).toBe(false);
  });
});

describe("looksLikeCardNumber", () => {
  it("flags 12-19 digit runs ignoring spaces and dashes only", () => {
    expect(looksLikeCardNumber("123456789012")).toBe(true);
    expect(looksLikeCardNumber("1234567890123456789")).toBe(true);
    expect(looksLikeCardNumber("12345678901")).toBe(false);
    expect(looksLikeCardNumber("CAN-2026-10-0042")).toBe(false);
    expect(looksLikeCardNumber("ticket 48213")).toBe(false);
  });
});
