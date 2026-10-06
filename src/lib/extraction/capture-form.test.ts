// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseCaptureForm } from "./capture-form";
import { DAILY_CAPTURE_CAP, MAX_TEXT_CHARS, bytesMatchType, capReached, capturePath, scaledSize } from "./limits";

const ID = "3f2b8c1e-7a4d-4e2b-9c1a-0d5e6f7a8b9c";

describe("parseCaptureForm", () => {
  it("accepts a description or pasted text, trimmed", () => {
    expect(parseCaptureForm({ kind: "text", text: "  NoteForge 12 USD a month " })).toEqual({
      ok: true,
      request: { kind: "text", text: "NoteForge 12 USD a month" },
    });
    expect(parseCaptureForm({ kind: "paste", text: "Receipt" })).toMatchObject({ ok: true, request: { kind: "paste" } });
  });

  it("refuses empty or overlong text before any model call", () => {
    expect(parseCaptureForm({ kind: "text", text: "   " })).toEqual({ ok: false, error: "Describe the subscription first." });
    expect(parseCaptureForm({ kind: "paste" })).toEqual({ ok: false, error: "Paste the email text first." });
    expect(parseCaptureForm({ kind: "paste", text: "x".repeat(MAX_TEXT_CHARS + 1) }).ok).toBe(false);
  });

  it("accepts an upload only with a UUID and an accepted type", () => {
    expect(parseCaptureForm({ kind: "upload", captureId: ID, mimeType: "application/pdf" })).toEqual({
      ok: true,
      request: { kind: "upload", captureId: ID, mimeType: "application/pdf" },
    });
    expect(parseCaptureForm({ kind: "upload", captureId: "../other-user/x", mimeType: "image/png" }).ok).toBe(false);
    expect(parseCaptureForm({ kind: "upload", captureId: ID, mimeType: "image/heic" }).ok).toBe(false);
    expect(parseCaptureForm({ kind: "seed", text: "x" }).ok).toBe(false);
  });
});

describe("limits", () => {
  it("builds the storage path inside the user's own folder", () => {
    expect(capturePath("user-1", ID, "image/jpeg")).toBe(`user-1/${ID}.jpg`);
  });

  it("stops at the daily cap", () => {
    expect(capReached(DAILY_CAPTURE_CAP - 1)).toBe(false);
    expect(capReached(DAILY_CAPTURE_CAP)).toBe(true);
  });

  it("scales the long edge down to 1568 px and never enlarges", () => {
    expect(scaledSize(3136, 1000)).toEqual({ width: 1568, height: 500 });
    expect(scaledSize(1170, 2532)).toEqual({ width: 725, height: 1568 });
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("checks the file signature against the declared type", () => {
    const b = (...xs: number[]) => new Uint8Array([...xs, ...Array(12).fill(0)].slice(0, 12));
    expect(bytesMatchType(b(0x25, 0x50, 0x44, 0x46), "application/pdf")).toBe(true);
    expect(bytesMatchType(b(0x89, 0x50, 0x4e, 0x47), "image/png")).toBe(true);
    expect(bytesMatchType(b(0xff, 0xd8, 0xff), "image/jpeg")).toBe(true);
    expect(bytesMatchType(b(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50), "image/webp")).toBe(true);
    expect(bytesMatchType(b(0x25, 0x50, 0x44, 0x46), "image/png")).toBe(false);
  });
});
