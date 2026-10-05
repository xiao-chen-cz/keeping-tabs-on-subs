// @vitest-environment node
// logic-spec §3.2 email rules, E40, E45-E46b.
import { describe, expect, it } from "vitest";
import { core } from "@/lib/domain/fixtures";
import type { Subscription } from "@/lib/domain/types";
import { buildDigest, renderDigestEmail, sentKey } from "./digest";

const sub = (id: string, over: Partial<Subscription> = {}): Subscription => ({
  ...core({ amountCents: 1000, currency: "EUR", billingCycle: "monthly", lastRenewalDate: "2026-09-07" }),
  id, name: id, vendor: null, plan: null, accountLabel: null, category: null, paymentMethod: null, scope: null,
  confidence: null, cancelUrl: null, notes: null, source: "manual", keptForCancelBy: null, alertMode: "remind",
  quietOfferShownAt: null, ...over,
});
const OFFSETS = [3, 1, 0];
const T = "2026-10-01"; // monthly base: cancel-by 2026-10-04, offset 3 reached
const APP = "https://app.example";

describe("buildDigest", () => {
  it("E46: two rows due the same day give one list, most urgent first", () => {
    const later = sub("Beta");
    const sooner = sub("Alpha", { lastRenewalDate: "2026-09-06" }); // cancel-by 10-03, 2 days left
    const items = buildDigest([later, sooner], OFFSETS, new Map(), T);
    expect(items.map((i) => [i.name, i.offset, i.daysLeft])).toEqual([["Alpha", 3, 2], ["Beta", 3, 3]]);
  });
  it("E46: a rerun the same day sends nothing", () => {
    expect(buildDigest([sub("Beta")], OFFSETS, new Map([[sentKey("Beta", "2026-10-04"), [3]]]), T)).toEqual([]);
  });
  it("sends the next offset once it is reached", () => {
    const sent = new Map([[sentKey("Beta", "2026-10-04"), [3]]]);
    expect(buildDigest([sub("Beta")], OFFSETS, sent, "2026-10-03").map((i) => i.offset)).toEqual([1]);
  });
  it("E46b: nothing due, nothing to send", () => {
    expect(buildDigest([sub("Beta")], OFFSETS, new Map(), "2026-09-20")).toEqual([]);
  });
  it("leaves out kept, cancelled and quiet monthly rows", () => {
    const rows = [
      sub("Kept", { keptForCancelBy: "2026-10-04" }),
      sub("Gone", { status: "cancelled" }),
      sub("Quiet", { alertMode: "quiet" }),
    ];
    expect(buildDigest(rows, OFFSETS, new Map(), T)).toEqual([]);
  });
  it("E40: a quiet yearly row is emailed once", () => {
    const y = sub("Yearly", { alertMode: "quiet", billingCycle: "yearly", lastRenewalDate: "2025-10-11" });
    expect(buildDigest([y], OFFSETS, new Map(), T).map((i) => i.offset)).toEqual([3]);
    expect(buildDigest([y], OFFSETS, new Map([[sentKey("Yearly", "2026-10-04"), [3]]]), "2026-10-04")).toEqual([]);
  });
  it("carries a price rise as formatted amounts", () => {
    const r = sub("Rise", { regularPriceCents: 1500, promoEnds: "2026-10-07" });
    expect(buildDigest([r], OFFSETS, new Map(), T)[0].priceRise).toEqual({ from: "€10.00", to: "€15.00" });
  });
});

describe("renderDigestEmail", () => {
  const items = buildDigest([sub("Beta"), sub("Alpha", { lastRenewalDate: "2026-09-06" })], OFFSETS, new Map(), T);
  it("names one row in the subject, or counts several", () => {
    expect(renderDigestEmail(items.slice(0, 1), APP).subject).toBe("Alpha: cancel by 3 Oct");
    expect(renderDigestEmail(items, APP).subject).toBe("2 subscriptions to decide on, first by 3 Oct");
  });
  it("links Keep and Cancelled to the confirm page, never to an action", () => {
    const { html, text } = renderDigestEmail(items, APP);
    expect(text).toContain("Keep it: https://app.example/alerts/Alpha?cb=2026-10-03&do=keep");
    expect(text).toContain("I cancelled it: https://app.example/alerts/Alpha?cb=2026-10-03&do=cancel");
    expect(html).toContain("https://app.example/settings");
    expect(text).toContain("Keeping Tabs on Subs");
  });
  it("escapes user text and drops non-http cancel links", () => {
    const evil = buildDigest([sub("<b>x</b>", { cancelUrl: "javascript:alert(1)", accountLabel: '"me"' })], OFFSETS, new Map(), T);
    const { html, text } = renderDigestEmail(evil, APP);
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&quot;me&quot;");
    expect(html + text).not.toContain("javascript:");
  });
});
