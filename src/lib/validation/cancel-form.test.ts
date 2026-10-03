// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCancelForm } from "./cancel-form";

const today = "2026-10-04";

describe("parseCancelForm", () => {
  it("accepts date, channel, optional reference, note and access until", () => {
    const r = parseCancelForm(
      { occurredOn: "2026-10-04", channel: "website_app", reference: " ABC-123 ", note: "", accessUntil: "2026-10-20" },
      today,
    );
    expect(r).toMatchObject({
      ok: true,
      record: { occurredOn: "2026-10-04", channel: "website_app", reference: "ABC-123", note: null },
      accessUntil: "2026-10-20",
    });
  });

  it("access until is optional", () => {
    const r = parseCancelForm({ occurredOn: today, channel: "email" }, today);
    expect(r.ok && r.accessUntil).toBeNull();
  });

  it("reports every error under its field", () => {
    const r = parseCancelForm({ occurredOn: "2026-10-05", channel: "", accessUntil: "nope" }, today);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fieldErrors.occurredOn).toEqual(["The date cannot be in the future"]);
      expect(r.fieldErrors.channel).toEqual(["Choose how you cancelled"]);
      expect(r.fieldErrors.accessUntil).toEqual(["Enter a valid date"]);
    }
  });

  it("rejects a reference that looks like a card number", () => {
    const r = parseCancelForm({ occurredOn: today, channel: "phone", reference: "4111 1111 1111 1111" }, today);
    expect(r.ok).toBe(false);
  });
});
