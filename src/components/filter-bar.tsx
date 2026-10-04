"use client";

import { useRef } from "react";
import { SCOPES } from "@/lib/domain/types";

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Search + scope as a plain GET form. Enter submits the search; changing the scope submits too. */
export function FilterBar({
  action,
  q,
  scope,
  cat,
  showCancelled,
  clearHref,
}: {
  action: string;
  q: string;
  scope: string | null;
  cat: string | null;
  showCancelled: boolean;
  clearHref: string | null;
}) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} method="get" action={action} role="search" className="space-y-1">
      {cat && <input type="hidden" name="cat" value={cat} />}
      {showCancelled && <input type="hidden" name="show" value="cancelled" />}
      <div className="grid grid-cols-[3fr_2fr] gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          maxLength={100}
          placeholder="Search"
          aria-label="Search name or vendor"
          className="input"
        />
        <select
          name="scope"
          defaultValue={scope ?? ""}
          aria-label="Scope"
          className="input"
          onChange={() => form.current?.requestSubmit()}
        >
          <option value="">All scopes</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </div>
      <noscript>
        <button type="submit" className="btn-secondary">Apply</button>
      </noscript>
      {clearHref && (
        <a href={clearHref} className="link inline-flex min-h-8 items-center text-sm">
          Clear
        </a>
      )}
    </form>
  );
}
