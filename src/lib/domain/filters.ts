// List filters: category tab, scope and free-text search. Pure; the URL is the only state.
import { SCOPES, type Scope } from "./types";

export const NO_CATEGORY = "none";
export const MAX_QUERY_LENGTH = 100;

export interface ListFilters {
  /** A category name, `"none"` for rows without one, or null for All. */
  category: string | typeof NO_CATEGORY | null;
  scope: Scope | null;
  q: string;
}

export interface Filterable {
  name: string;
  vendor?: string | null;
  category?: string | null;
  scope?: Scope | null;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function first(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  return Array.isArray(v) ? v[0] : v;
}

export function parseListFilters(params: Params): ListFilters {
  const cat = first(params, "cat")?.trim();
  const scope = first(params, "scope");
  return {
    category: cat ? cat : null,
    scope: (SCOPES as readonly string[]).includes(scope ?? "") ? (scope as Scope) : null,
    q: (first(params, "q") ?? "").trim().slice(0, MAX_QUERY_LENGTH).trim(),
  };
}

const matchesQuery = (r: Filterable, q: string) => {
  const needle = q.toLowerCase();
  return r.name.toLowerCase().includes(needle) || (r.vendor ?? "").toLowerCase().includes(needle);
};

const matchesScope = (r: Filterable, f: ListFilters) => f.scope === null || r.scope === f.scope;

const matchesCategory = (r: Filterable, f: ListFilters) =>
  f.category === null ||
  (f.category === NO_CATEGORY ? !r.category : r.category === f.category);

/** Search and scope only (what the tab counts are based on). */
export function applyBaseFilters<R extends { input: Filterable }>(rows: R[], f: ListFilters): R[] {
  return rows.filter((r) => matchesScope(r.input, f) && (f.q === "" || matchesQuery(r.input, f.q)));
}

export function applyFilters<R extends { input: Filterable }>(rows: R[], f: ListFilters): R[] {
  return applyBaseFilters(rows, f).filter((r) => matchesCategory(r.input, f));
}

export const isFiltered = (f: ListFilters) => f.category !== null || f.scope !== null || f.q !== "";

/** One tab per category present (sorted by name), then "No category" if any row lacks one. "All" is added by the UI. */
export function categoryTabs<R extends { input: Filterable }>(
  rows: R[],
): { key: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  let none = 0;
  for (const { input } of rows) {
    if (input.category) counts.set(input.category, (counts.get(input.category) ?? 0) + 1);
    else none++;
  }
  const tabs = [...counts]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([key, count]) => ({ key, label: key, count }));
  if (none > 0) tabs.push({ key: NO_CATEGORY, label: "No category", count: none });
  return tabs;
}

/** Build a list URL from the current view state; empty values are omitted. */
export function listHref(
  basePath: string,
  s: { cat?: string | null; q?: string; scope?: string | null; showCancelled?: boolean },
): string {
  const p = new URLSearchParams();
  if (s.cat) p.set("cat", s.cat);
  if (s.scope) p.set("scope", s.scope);
  if (s.q) p.set("q", s.q);
  if (s.showCancelled) p.set("show", "cancelled");
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
