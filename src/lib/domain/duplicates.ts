// Which list rows share a name, so the Account label can tell them apart (only then).
const norm = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

interface Named {
  input: { name: string };
}

/** Normalised names (trimmed, case-insensitive) that appear on more than one row. */
export function duplicateNames(rows: readonly Named[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const r of rows) {
    const k = norm(r.input.name);
    if (seen.has(k)) dup.add(k);
    else seen.add(k);
  }
  return dup;
}

/** The account label to show in a row's meta line: set, and the name is shared with another row. */
export function accountToShow(
  duplicates: ReadonlySet<string> | undefined,
  input: { name: string; accountLabel?: string | null },
): string | null {
  const label = input.accountLabel?.trim();
  return label && duplicates?.has(norm(input.name)) ? label : null;
}
