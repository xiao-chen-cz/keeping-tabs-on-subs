import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SubscriptionDetail } from "@/components/subscription-detail";
import { todayIn } from "@/lib/dates/plain-date";
import { demoRow } from "../demo-data";

export default async function DemoDetailPage({ params }: PageProps<"/demo/[key]">) {
  await connection(); // today changes daily: never prerender
  const { key } = await params;
  const row = demoRow(key, todayIn("Europe/Berlin", new Date()));
  if (!row) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md px-4 pt-2">
        <Link href="/demo" className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400">
          Back to list
        </Link>
      </div>
      <SubscriptionDetail row={row} />
    </main>
  );
}
