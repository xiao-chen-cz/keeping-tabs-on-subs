import Link from "next/link";
import { RenewalsList } from "@/components/renewals-list";
import { todayIn } from "@/lib/dates/plain-date";
import { DEFAULT_ALERT_OFFSETS } from "@/lib/domain/alerts";
import { demoView } from "./demo-data";

// Reading searchParams makes this render per request, so "today" is never stale.
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const { show } = await searchParams;
  const showArchived = show === "cancelled";
  const today = todayIn("Europe/Berlin", new Date());
  const { groups, totals } = demoView(today);

  return (
    <main className="flex flex-1 flex-col">
      <RenewalsList
        groups={groups}
        totals={totals}
        hrefFor={(r) => `/demo/${r.input.key}`}
        showArchived={showArchived}
        alertOffsets={[...DEFAULT_ALERT_OFFSETS]}
      />
      {groups.archived.length > 0 && (
        <div className="pb-8">
          <Link
            href={showArchived ? "/demo" : "/demo?show=cancelled"}
            className="link inline-flex min-h-10 items-center text-sm"
          >
            {showArchived ? "Hide cancelled" : "Show cancelled"}
          </Link>
        </div>
      )}
    </main>
  );
}
