import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { computeSubscription } from "@/lib/domain/compute";
import { core } from "@/lib/domain/fixtures";
import type { ListFilters } from "@/lib/domain/filters";
import { totalsByCurrency } from "@/lib/domain/totals";
import type { Scope, SubscriptionCore } from "@/lib/domain/types";
import { groupAndSort } from "@/lib/domain/upcoming";
import { RenewalsList } from "./renewals-list";

afterEach(cleanup);
const TODAY = "2026-10-03";
const monthly = { amountCents: 1000, currency: "EUR", billingCycle: "monthly" } as const;
type Extra = { category: string | null; scope: Scope | null; vendor: string | null };

const raw: (Partial<SubscriptionCore> & Partial<Extra>)[] = [
  { name: "Soonish", category: "Media", ...monthly, lastRenewalDate: "2026-09-06" }, // due today
  { name: "Robo", category: "AI", scope: "business", ...monthly, amountCents: 2000, lastRenewalDate: "2026-09-16" },
  { name: "Brain", category: "AI", scope: "personal", vendor: "Neuronix", ...monthly, lastRenewalDate: "2026-09-17" },
  { name: "Tune", category: "Media", scope: "personal", ...monthly, lastRenewalDate: "2026-09-18" },
  { name: "Loose", ...monthly, lastRenewalDate: "2026-09-19" },
];
const computed = raw.map(({ category = null, scope = null, vendor = null, ...c }) => {
  const r = computeSubscription(core(c), TODAY);
  return { ...r, input: { ...r.input, category, scope, vendor } };
});
const groups = groupAndSort(computed);
const totals = totalsByCurrency(computed);
const none: ListFilters = { category: null, scope: null, q: "" };

const list = (filters: ListFilters, tabsEnabled = true) =>
  render(
    <RenewalsList groups={groups} totals={totals} alertOffsets={[3, 1, 0]} filters={filters} tabsEnabled={tabsEnabled} basePath="/demo" />,
  );

describe("RenewalsList filters and tabs", () => {
  it("keeps a due row in Due soon even when the active tab excludes it", () => {
    list({ ...none, category: "AI" });
    expect(within(screen.getByRole("region", { name: "Due soon" })).getByText("Soonish")).toBeTruthy();
  });

  it("the AI tab hides non-AI rows from Upcoming and marks itself current", () => {
    list({ ...none, category: "AI" });
    const up = within(screen.getByRole("region", { name: "Upcoming" }));
    expect(up.getByText("Robo")).toBeTruthy();
    expect(up.queryByText("Tune")).toBeNull();
    expect(up.queryByText("Loose")).toBeNull();
    const nav = within(screen.getByRole("navigation", { name: "Categories" }));
    expect(nav.getByText("AI").closest("a")?.getAttribute("aria-current")).toBe("page");
    expect(nav.getByText("AI").closest("a")?.getAttribute("href")).toBe("/demo?cat=AI");
    expect(nav.getByText("No category")).toBeTruthy();
  });

  it("totals follow the tab and the heading names the filter", () => {
    list({ ...none, category: "AI" });
    const t = within(screen.getByRole("region", { name: "Totals" }));
    expect(t.getByText("AI · total")).toBeTruthy();
    expect(t.getByText("€30.00 / month")).toBeTruthy();
  });

  it("hides the tabs and ignores cat when tabsEnabled is false", () => {
    list({ ...none, category: "AI" }, false);
    expect(screen.queryByRole("navigation", { name: "Categories" })).toBeNull();
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(within(screen.getByRole("region", { name: "Upcoming" })).getByText("Tune")).toBeTruthy();
  });

  it("shows the filtered empty state, not the no-subscriptions one", () => {
    list({ ...none, q: "zzz" });
    expect(screen.getByText("Nothing matches these filters.")).toBeTruthy();
    expect(screen.queryByText("No subscriptions yet")).toBeNull();
    expect(screen.queryByRole("region", { name: "Upcoming" })).toBeNull();
  });

  it("search matches the vendor, case-insensitively", () => {
    list({ ...none, q: "NEURO" });
    const up = within(screen.getByRole("region", { name: "Upcoming" }));
    expect(up.getByText("Brain")).toBeTruthy();
    expect(up.queryByText("Robo")).toBeNull();
  });

  it("scope filter applies and shows in the totals heading", () => {
    list({ ...none, scope: "personal" });
    expect(screen.getByText("Personal · total")).toBeTruthy();
  });
});
