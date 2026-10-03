// Calendar-date arithmetic on `YYYY-MM-DD` strings via UTC epoch days (plan P6). No DST, no date library.
import type { PlainDate } from "@/lib/domain/types";

const MS_PER_DAY = 86_400_000;
const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width: number) => String(n).padStart(width, "0");
const format = (y: number, m: number, d: number): PlainDate => `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based

function parts(date: PlainDate): [number, number, number] {
  const m = PATTERN.exec(date);
  if (!m) throw new Error(`Not a plain date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isPlainDate(value: unknown): value is PlainDate {
  if (typeof value !== "string") return false;
  const m = PATTERN.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function toDayNumber(date: PlainDate): number {
  const [y, m, d] = parts(date);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): PlainDate {
  const dt = new Date(n * MS_PER_DAY);
  return format(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export const addDays = (date: PlainDate, n: number): PlainDate => fromDayNumber(toDayNumber(date) + n);

/** a − b in whole days. */
export const diffDays = (a: PlainDate, b: PlainDate): number => toDayNumber(a) - toDayNumber(b);

/** Negative, zero or positive; ISO strings also sort lexically, this keeps intent explicit. */
export const compare = (a: PlainDate, b: PlainDate): number => Math.sign(diffDays(a, b));

/** anchor + n months, clamped to the month end, always from the original anchor (§2.1). */
export function addMonthsClamped(anchor: PlainDate, n: number): PlainDate {
  const [y, m, d] = parts(anchor);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total - ny * 12 + 1;
  return format(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Whole months from a's month to b's month (ignores the day). */
export function monthsBetween(a: PlainDate, b: PlainDate): number {
  const [ay, am] = parts(a);
  const [by, bm] = parts(b);
  return (by - ay) * 12 + (bm - am);
}

/** The user's local calendar date at instant `now` (D8). */
export function todayIn(timeZone: string, now: Date): PlainDate {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
