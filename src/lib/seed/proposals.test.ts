// @vitest-environment node
import { computeSubscription } from "@/lib/domain/compute";
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

  it("P1 lacks only the billing cycle (one question), with the stated next charge as a future anchor", () => {
    const p1 = buildSeedProposals("starter", TODAY)[0]!;
    // see the missing-field assertion below
    expect(p1.draft).toMatchObject({
      name: "NoteForge", amountCents: 1200, currency: "USD", billingCycle: null,
      lastRenewalDate: addDays(TODAY, 28), cancelUrl: "https://noteforge.example/billing",
      cancelNoticeDays: null, category: null,
    });
    expect(p1.draft.fieldConfidence).toEqual({ amountCents: "high", category: "low" });
    expect(missingRequired(p1.draft)).toEqual(["billingCycle"]);
    expect(p1.capture.rawText(p1.captureDate)).toContain(addDays(TODAY, 28));
  });

  it("P2 matches CodePilot Pro (seed #1) despite the different amount ($25.00 vs $20.00), and is the receipt for its last charge, so approval keeps the schedule", () => {
    const p2 = buildSeedProposals("full", TODAY)[1]!;
    const subs = buildSeed("full", TODAY);
    const hit = matchExisting(p2.draft, subs);
    expect(hit).toBe(subs.find((s) => s.key === p2.updatesSeedKey)!.id);
    expect(subs.find((s) => s.id === hit)!.name).toBe("CodePilot Pro");
    expect(p2.draft.amountCents).toBe(2500);
    expect(subs.find((s) => s.key === 1)!.amountCents).toBe(2000);
    expect(p2.capture.rawText(p2.captureDate)).toContain("Amount: $25.00 USD");
    const codePilot = subs.find((s) => s.key === 1)!;
    expect(p2.draft.lastRenewalDate).toBe(codePilot.lastRenewalDate);
    expect(p2.captureDate).toBe(codePilot.lastRenewalDate);
    // Approving must not move the next renewal.
    const before = computeSubscription(codePilot, TODAY).computed.nextRenewal;
    const after = computeSubscription({ ...codePilot, lastRenewalDate: p2.draft.lastRenewalDate }, TODAY).computed.nextRenewal;
    expect(after).toBe(before);
    expect(p2.draft.updatesSubscriptionId).toBeNull();
  });

  it("P3 lacks currency, cycle and date", () => {
    const p3 = buildSeedProposals("full", TODAY)[2]!;
    expect(missingRequired(p3.draft)).toEqual(["currency", "billingCycle", "lastRenewalDate|trialEnds"]);
    expect(p3.draft).toMatchObject({ name: "Gymbox", amountCents: 3900 });
  });
});
