import Link from "next/link";

// No auth check here: layouts do not re-render on navigation. Pages and actions call the DAL.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-heading text-lg font-semibold text-primary-ink">
            Keeping Tabs on Subs
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link href="/capture" className="btn-primary min-h-9 whitespace-nowrap px-3 text-sm" aria-label="New subscription">
              + New
            </Link>
            <Link href="/settings" className="link text-sm">
              Settings
            </Link>
          </div>
        </div>
      </header>
      <p className="bg-light px-4 py-1.5 text-center text-xs text-mid">
        Demo: reminders show under Due soon and, unless you switch it off in Settings, by email at most once a day.
      </p>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">{children}</div>
    </>
  );
}
