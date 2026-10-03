import Link from "next/link";

// Public and read-only: no auth, no database.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link href="/demo" className="font-semibold tracking-tight">
          Keeping Tabs · Demo
        </Link>
      </header>
      <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Demo with sample data. Nothing here is real, nothing can be changed, and no alerts are sent.{" "}
        <Link href="/login" className="underline">
          Sign in for your own.
        </Link>
      </p>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">{children}</div>
    </>
  );
}
