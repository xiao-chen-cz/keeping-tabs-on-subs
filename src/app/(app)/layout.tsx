import Link from "next/link";
import { signOut } from "@/lib/dal/auth-actions";

// No auth check here: layouts do not re-render on navigation. Pages and actions call the DAL.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-lg font-semibold text-primary-ink">
            Keeping Tabs on Subs
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="link text-sm">
              Settings
            </Link>
            <form action={signOut}>
              <button type="submit" className="link text-sm">
                Sign out
              </button>
            </form>
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
