import Link from "next/link";

/**
 * Entry to the review queue: new entries that are not in the list yet. Styled as a calm inbox row, not a
 * primary button, and placed under Due soon, so the two do not read as one bucket (owner feedback 2026-10-05).
 */
export function ReviewInbox({ count, href }: { count: number; href: string }) {
  if (count === 0) return null;
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 rounded-control border border-line bg-surface px-3 py-2 active:bg-light"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13h5l1.5 3h5L16 13h5" />
        <path d="M5.5 5h13L21 13v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z" />
      </svg>
      <span className="flex-1">
        <span className="block font-semibold text-text">
          {count} new {count === 1 ? "entry" : "entries"} to check
        </span>
        <span className="block text-sm text-mid">Not in your list yet</span>
      </span>
      <span aria-hidden className="text-xl text-mid">
        ›
      </span>
    </Link>
  );
}
