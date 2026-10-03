// @vitest-environment node
import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates/plain-date";
import { missingRequired, matchExisting } from "@/lib/domain/proposal";
import { buildSeed } from "./build-seed";
import { buildSeedProposals } from "./proposals";

const TODAY = "2026-10-03";

describe("buildSeedProposals", () => {
  it("gives the starter set P1 only and the full set P1-P3", () => {
    expect(buildSeedProposals("starter", TODAY).map((p) => p.key)).toEqual(["P1"]);
    expect(buildSeedProposals("full", TODAY).map((p) => p.key)).toEqual(["P1", "P2", "P3"]);
  });

  it("P1 is complete except the category, with the stated next charge as a future anchor", () => {
    const p1 = buildSeedProposals("starter", TODAY)[0]!;
    expect(missingRequired(p1.draft)).toEqual([]);
    expect(p1.draft).toMatchObject({
      name: "NoteForge", amountCents: 1200, currency: "USD", billingCycle: "monthly",
      lastRenewalDate: addDays(TODAY, 28), cancelUrl: "https://noteforge.example/billing",
      cancelNoticeDays: null, category: null,
    });
    expect(p1.draft.fieldConfidence).toEqual({ amountCents: "high", billingCycle: "medium", category: "low" });
    expect(p1.capture.rawText(p1.captureDate)).toContain(addDays(TODAY, 28));
  });

  it("P2 matches CodePilot Pro (seed #1) and stands for a charge dated today", () => {
    const p2 = buildSeedProposals("full", TODAY)[1]!;
    const subs = buildSeed("full", TODAY);
    const hit = matchExisting(p2.draft, subs);
    expect(hit).toBe(subs.find((s) => s.key === p2.updatesSeedKey)!.id);
    expect(subs.find((s) => s.id === hit)!.name).toBe("CodePilot Pro");
    expect(p2.draft.lastRenewalDate).toBe(TODAY);
    expect(p2.draft.updatesSubscriptionId).toBeNull();
  });

  it("P3 lacks currency, cycle and date", () => {
    const p3 = buildSeedProposals("full", TODAY)[2]!;
    expect(missingRequired(p3.draft)).toEqual(["currency", "billingCycle", "lastRenewalDate|trialEnds"]);
    expect(p3.draft).toMatchObject({ name: "Gymbox", amountCents: 3900 });
  });
});
