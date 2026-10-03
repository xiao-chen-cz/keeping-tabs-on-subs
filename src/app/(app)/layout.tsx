import Link from "next/link";
import { signOut } from "@/lib/dal/auth-actions";

// No auth check here: layouts do not re-render on navigation. Pages and actions call the DAL.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link href="/" className="font-semibold tracking-tight">
          Keeping Tabs
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-sm text-zinc-600 underline dark:text-zinc-400">
            Sign out
          </button>
        </form>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">{children}</div>
    </>
  );
}
