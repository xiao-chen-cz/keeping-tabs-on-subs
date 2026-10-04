// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyFilters, categoryTabs, listHref, parseListFilters } from "./filters";

const r = (name: string, category: string | null, scope: "business" | "personal" | null = null, vendor: string | null = null) => ({
  input: { name, category, scope, vendor },
});
const rows = [r("Alpha", "AI", "business"), r("Beta", "Media", "personal", "Streamco"), r("Gamma", "AI", "personal"), r("Delta", null)];

describe("parseListFilters", () => {
  it("parses, trims and validates", () => {
    expect(parseListFilters({ cat: "AI", scope: "family", q: "  hi " })).toEqual({ category: "AI", scope: "family", q: "hi" });
    expect(parseListFilters({ scope: "bogus", q: ["a", "b"] })).toEqual({ category: null, scope: null, q: "a" });
    expect(parseListFilters({ q: "x".repeat(300) }).q).toHaveLength(100);
    expect(parseListFilters(new URLSearchParams("cat=none")).category).toBe("none");
  });
});

describe("applyFilters", () => {
  it("filters by category, none, scope and name or vendor", () => {
    const f = (o: Partial<ReturnType<typeof parseListFilters>>) => ({ category: null, scope: null, q: "", ...o });
    expect(applyFilters(rows, f({ category: "AI" })).map((x) => x.input.name)).toEqual(["Alpha", "Gamma"]);
    expect(applyFilters(rows, f({ category: "none" })).map((x) => x.input.name)).toEqual(["Delta"]);
    expect(applyFilters(rows, f({ scope: "personal" })).length).toBe(2);
    expect(applyFilters(rows, f({ q: "STREAM" })).map((x) => x.input.name)).toEqual(["Beta"]);
    expect(applyFilters(rows, f({ q: "alp", category: "AI", scope: "business" })).length).toBe(1);
  });
});

describe("categoryTabs", () => {
  it("sorts by name with counts and a trailing No category", () => {
    expect(categoryTabs(rows)).toEqual([
      { key: "AI", label: "AI", count: 2 },
      { key: "Media", label: "Media", count: 1 },
      { key: "none", label: "No category", count: 1 },
    ]);
  });
});

describe("listHref", () => {
  it("omits empty values and encodes", () => {
    expect(listHref("/demo", {})).toBe("/demo");
    expect(listHref("/", { cat: "Dev & Ops", q: "a b", showCancelled: true })).toBe("/?cat=Dev+%26+Ops&q=a+b&show=cancelled");
  });
});
