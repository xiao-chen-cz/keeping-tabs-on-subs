import Link from "next/link";
import { signOut } from "@/lib/dal/auth-actions";

// No auth check here: layouts do not re-render on navigation. Pages and actions call the DAL.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-lg font-semibold text-primary-ink">
            Keeping Tabs
          </Link>
          <form action={signOut}>
            <button type="submit" className="link text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <p className="bg-light px-4 py-1.5 text-center text-xs text-mid">
        Demo: alerts show in the app only, no emails are sent yet.
      </p>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-4">{children}</div>
    </>
  );
}
