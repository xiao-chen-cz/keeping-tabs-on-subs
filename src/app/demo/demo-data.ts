// Pure view-model for the public demo: in-memory seed rows, no database. `today` is injected.
import { computeSubscription } from "@/lib/domain/compute";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";
import type { PlainDate } from "@/lib/domain/types";
import { buildSeed, SEED_CATEGORIES, SEED_PAYMENT_METHODS } from "@/lib/seed/build-seed";
import { buildSeedProposals } from "@/lib/seed/proposals";
import type { ExistingForReview } from "@/components/review-values";
import type { Proposal } from "@/lib/dal/map-proposal";

export function demoView(today: PlainDate) {
  const rows = buildSeed("full", today).map((s) => computeSubscription(s, today));
  return { rows, groups: groupAndSort(rows), totals: totalsByCurrency(rows) };
}

export function demoRow(key: string, today: PlainDate) {
  if (!/^\d+$/.test(key)) return undefined;
  return demoView(today).rows.find((r) => r.input.key === Number(key));
}

export interface DemoProposal {
  key: string;
  proposal: Proposal;
  captureText: string;
  /** The matched seed subscription (P2 updates #1), shaped for the update overlay. */
  existing: ExistingForReview | null;
}

/** In-memory seed proposals P1-P3 for the read-only demo queue. Category/payment ids are their names. */
export function demoProposals(today: PlainDate): DemoProposal[] {
  const subs = buildSeed("full", today);
  return buildSeedProposals("full", today).map((p) => {
    const match = p.updatesSeedKey === null ? undefined : subs.find((s) => s.key === p.updatesSeedKey);
    return {
      key: p.key,
      captureText: p.capture.rawText(p.captureDate),
      existing: match
        ? { subscription: match, categoryId: match.category, paymentMethodId: match.paymentMethod }
        : null,
      proposal: {
        id: p.key,
        status: "pending",
        captureId: p.capture.key,
        draft: p.draft,
        categoryId: null,
        paymentMethodId: null,
        subscriptionId: null,
        decidedAt: null,
        createdAt: today,
      },
    };
  });
}

export function demoProposal(key: string, today: PlainDate) {
  return demoProposals(today).find((p) => p.key === key);
}

export const DEMO_LOOKUPS = {
  categories: SEED_CATEGORIES.map((n) => ({ id: n, name: n })),
  paymentMethods: SEED_PAYMENT_METHODS.map((n) => ({ id: n, name: n })),
};
