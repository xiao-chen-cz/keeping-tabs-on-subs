// Pure view-model for the public demo: in-memory seed rows, no database. `today` is injected.
import { computeSubscription } from "@/lib/domain/compute";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";
import type { PlainDate } from "@/lib/domain/types";
import { buildSeed } from "@/lib/seed/build-seed";

export function demoView(today: PlainDate) {
  const rows = buildSeed("full", today).map((s) => computeSubscription(s, today));
  return { rows, groups: groupAndSort(rows), totals: totalsByCurrency(rows) };
}

export function demoRow(key: string, today: PlainDate) {
  if (!/^\d+$/.test(key)) return undefined;
  return demoView(today).rows.find((r) => r.input.key === Number(key));
}
