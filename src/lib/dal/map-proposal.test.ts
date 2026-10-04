// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseFieldConfidence, rowToCapture, rowToEvent, rowToProposal, type EventRow, type ProposalRow } from "./map-proposal";

const row: ProposalRow = {
  id: "p1", user_id: "u1", capture_id: "c1", status: "pending", name: "NoteForge", amount: 12,
  currency: "USD", billing_cycle: "monthly", last_renewal_date: "2026-10-31", trial_ends: null,
  cancel_notice_days: null, regular_price: null, promo_ends: null, category_id: "cat1",
  payment_method_id: null, scope: null, confidence: null, vendor: null, plan: null, account_label: null,
  cancel_url: "https://noteforge.example/billing", notes: null,
  field_confidence: { amountCents: "high", category: "low", bogus: "certain", other: 3 },
  updates_subscription_id: null, subscription_id: null, decided_at: null, created_at: "2026-10-03T08:00:00Z",
};
const lookups = { categories: new Map([["cat1", "AI"]]), paymentMethods: new Map<string, string>() };

describe("rowToProposal", () => {
  it("maps columns to a draft, money to cents and ids to names", () => {
    const p = rowToProposal(row, lookups);
    expect(p).toMatchObject({ id: "p1", status: "pending", captureId: "c1", categoryId: "cat1" });
    expect(p.draft).toMatchObject({
      name: "NoteForge", amountCents: 1200, currency: "USD", billingCycle: "monthly",
      lastRenewalDate: "2026-10-31", category: "AI", paymentMethod: null, accessUntil: null,
      updatesSubscriptionId: null,
    });
  });
  it("keeps nulls null (sparse proposals)", () => {
    const p = rowToProposal({ ...row, name: null, amount: null, currency: null, category_id: null }, lookups);
    expect(p.draft).toMatchObject({ name: null, amountCents: null, currency: null, category: null });
  });
});

describe("parseFieldConfidence", () => {
  it("drops unknown values and non-objects", () => {
    expect(parseFieldConfidence(row.field_confidence)).toEqual({ amountCents: "high", category: "low" });
    expect(parseFieldConfidence(null)).toEqual({});
    expect(parseFieldConfidence(["high"])).toEqual({});
  });
});

describe("rowToEvent / rowToCapture", () => {
  it("maps snake_case to camelCase", () => {
    const e: EventRow = {
      id: "e1", user_id: "u", subscription_id: "s1", kind: "cancelled", occurred_on: "2026-10-04",
      channel: "website_app", reference: "ABC-123", note: null, capture_id: null, recorded_at: "2026-10-04T10:00:00Z",
    };
    expect(rowToEvent(e)).toEqual({
      id: "e1", subscriptionId: "s1", kind: "cancelled", occurredOn: "2026-10-04", channel: "website_app",
      reference: "ABC-123", note: null, captureId: null, recordedAt: "2026-10-04T10:00:00Z",
    });
    expect(
      rowToCapture({
        id: "c1", user_id: "u", input: "seed", raw_text: "hi", storage_path: null, mime_type: "text/plain",
        received_at: "t", extraction: null, extraction_error: null,
      }),
    ).toMatchObject({ id: "c1", input: "seed", rawText: "hi" });
  });
});
