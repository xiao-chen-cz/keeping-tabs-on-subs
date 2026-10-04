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
      <Link href="/demo" className="link inline-flex min-h-10 items-center text-sm">
        Back to list
      </Link>
      <SubscriptionDetail row={row} />
    </main>
  );
}
