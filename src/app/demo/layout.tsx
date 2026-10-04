import Link from "next/link";

// Public and read-only: no auth, no database.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-xl px-4 py-3">
          <Link href="/demo" className="font-heading text-lg font-semibold text-primary-ink">
            Keeping Tabs · Demo
          </Link>
        </div>
      </header>
      <p className="bg-light px-4 py-1.5 text-center text-xs text-mid">
        Demo with sample data. Nothing here is real, nothing can be changed, and no alerts are sent.{" "}
        <Link href="/login" className="link">
          Sign in for your own.
        </Link>
      </p>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-4">{children}</div>
    </>
  );
}
