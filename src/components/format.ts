// Shared display formatting. PlainDates are formatted by parts, so no time zone can shift them.
import type { PlainDate } from "@/lib/domain/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(date: PlainDate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** '2026-10-05' -> '5 Oct' */
export function formatDay(date: PlainDate): string {
  const { m, d } = parts(date);
  return `${d} ${MONTHS[m - 1]}`;
}

/** '2026-10-05' -> '5 Oct 2026' */
export function formatDayLong(date: PlainDate): string {
  return `${formatDay(date)} ${parts(date).y}`;
}

/** 0 -> 'today', 1 -> 'tomorrow', 3 -> 'in 3 days', -1 -> 'yesterday', -2 -> '2 days ago' */
export function relativeDays(n: number): string {
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
