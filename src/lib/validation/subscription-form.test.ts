// @vitest-environment node
import { describe, expect, it } from "vitest";
import { missingForApproval, parseSubscriptionForm } from "./subscription-form";

const full = {
  name: "Daily Ledger",
  amount: "9.99",
  currency: "EUR",
  billing_cycle: "monthly",
  last_renewal_date: "2026-09-20",
};

function errorsOf(values: Record<string, string>, mode: "create" | "edit") {
  const r = parseSubscriptionForm(values, mode);
  if (r.ok) throw new Error("expected failure");
  return r.fieldErrors;
}

describe("account_label", () => {
  const base = { name: "X", amount: "1", currency: "EUR", billing_cycle: "monthly", last_renewal_date: "2026-10-01" };
  it("is optional, trimmed, and null when blank", () => {
    const blank = parseSubscriptionForm({ ...base, account_label: "  " }, "create");
    expect(blank.ok && blank.data.account_label).toBeNull();
    const set = parseSubscriptionForm({ ...base, account_label: "  me@example.com " }, "create");
    expect(set.ok && set.data.account_label).toBe("me@example.com");
  });
  it("rejects more than 200 characters", () => {
    const r = parseSubscriptionForm({ ...base, account_label: "a".repeat(201) }, "create");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.fieldErrors.account_label).toBeTruthy();
    expect(parseSubscriptionForm({ ...base, account_label: "a".repeat(200) }, "create").ok).toBe(true);
  });
});

describe("parseSubscriptionForm", () => {
  it("accepts a full create and maps to columns", () => {
    const r = parseSubscriptionForm(full, "create");
    expect(r).toMatchObject({
      ok: true,
      data: { name: "Daily Ledger", amount: "9.99", currency: "EUR", notes: null },
    });
  });

  it("create (confirmed) requires amount, currency, cycle and one date", () => {
    const e = errorsOf({ name: "X" }, "create");
    expect(Object.keys(e).sort()).toEqual(["amount", "billing_cycle", "currency", "last_renewal_date"]);
  });

  it("a trial end date satisfies the date requirement", () => {
    const { last_renewal_date: _omit, ...rest } = full;
    void _omit;
    expect(parseSubscriptionForm({ ...rest, trial_ends: "2026-10-10" }, "create").ok).toBe(true);
  });

  it("edit requires only the name", () => {
    expect(parseSubscriptionForm({ name: "X", notes: "hi" }, "edit").ok).toBe(true);
    expect(errorsOf({ name: "  " }, "edit").name).toEqual(["Enter a name"]);
  });

  it("create cannot make a cancelled row: a submitted status is ignored and the create rules still apply (D12)", () => {
    expect(Object.keys(errorsOf({ name: "X", status: "cancelled" }, "create")).sort()).toEqual([
      "amount",
      "billing_cycle",
      "currency",
      "last_renewal_date",
    ]);
    const r = parseSubscriptionForm({ ...full, status: "cancelled" }, "create");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).not.toHaveProperty("status");
  });

  it("amount needs a currency, even on edit", () => {
    expect(errorsOf({ name: "X", amount: "5" }, "edit").currency).toEqual([
      "Choose a currency for the amount",
    ]);
  });

  it("regular price and promo ends are both or neither", () => {
    expect(errorsOf({ ...full, regular_price: "12" }, "create").promo_ends).toBeDefined();
    expect(errorsOf({ ...full, promo_ends: "2026-12-01" }, "create").regular_price).toBeDefined();
    expect(
      parseSubscriptionForm({ ...full, regular_price: "12", promo_ends: "2026-12-01" }, "create").ok,
    ).toBe(true);
  });

  it("accepts a decimal comma", () => {
    const r = parseSubscriptionForm({ ...full, amount: "9,99" }, "create");
    expect(r.ok && r.data.amount).toBe("9.99");
    const r2 = parseSubscriptionForm({ ...full, amount: "10" }, "create");
    expect(r2.ok && r2.data.amount).toBe("10.00");
  });

  it("rejects bad amounts", () => {
    for (const amount of ["-1", "1.234", "abc", "1,2,3"]) {
      expect(errorsOf({ ...full, amount }, "create").amount).toBeDefined();
    }
  });

  it("rejects impossible dates", () => {
    expect(errorsOf({ ...full, last_renewal_date: "2026-02-30" }, "create").last_renewal_date).toEqual([
      "Enter a valid date",
    ]);
    expect(errorsOf({ ...full, trial_ends: "10/10/2026" }, "create").trial_ends).toBeDefined();
  });

  it("allows only https cancel URLs", () => {
    expect(parseSubscriptionForm({ ...full, cancel_url: "https://x.example/cancel" }, "create").ok).toBe(true);
    expect(errorsOf({ ...full, cancel_url: "http://x.example" }, "create").cancel_url).toBeDefined();
    expect(errorsOf({ ...full, cancel_url: "javascript:alert(1)" }, "create").cancel_url).toBeDefined();
  });

  it("keeps notice days within 0 to 365", () => {
    const ok = (v: string) => parseSubscriptionForm({ ...full, cancel_notice_days: v }, "create");
    expect(ok("0").ok && ok("0")).toMatchObject({ data: { cancel_notice_days: 0 } });
    expect(ok("365").ok).toBe(true);
    for (const v of ["366", "-1", "2.5", "x"]) expect(ok(v).ok).toBe(false);
    const empty = parseSubscriptionForm({ ...full, cancel_notice_days: "" }, "create");
    expect(empty.ok && empty.data.cancel_notice_days).toBeNull();
  });

  it("strips user_id, source and computed fields", () => {
    const r = parseSubscriptionForm(
      { ...full, user_id: "x", source: "seed", next_renewal: "2026-01-01", cancel_by: "2026-01-01" },
      "create",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const k of ["user_id", "source", "status", "next_renewal", "cancel_by"]) expect(r.data).not.toHaveProperty(k);
    }
  });

  it("never returns status or access_until, even when submitted (edit cannot change status, D12)", () => {
    const r = parseSubscriptionForm({ ...full, status: "cancelled", access_until: "2026-12-01" }, "edit");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).not.toHaveProperty("status");
      expect(r.data).not.toHaveProperty("access_until");
    }
  });

  it("rejects non-uuid category and bad enums", () => {
    expect(errorsOf({ ...full, category_id: "nope" }, "create").category_id).toBeDefined();
    expect(errorsOf({ ...full, currency: "JPY" }, "create").currency).toBeDefined();
    expect(parseSubscriptionForm({ ...full, category_id: "" }, "create").ok).toBe(true);
  });
});

describe("missingForApproval", () => {
  it("lists missing required fields", () => {
    expect(missingForApproval({ name: "X" })).toEqual(["amount", "currency", "billing_cycle", "last_renewal_date"]);
    expect(
      missingForApproval({ name: "X", amount: "1.00", currency: "EUR", billing_cycle: "yearly", trial_ends: "2026-10-10" }),
    ).toEqual([]);
  });
});
