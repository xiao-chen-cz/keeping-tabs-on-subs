import { cookies } from "next/headers";
import Link from "next/link";
import { RenewalsList } from "@/components/renewals-list";
import { ReviewInbox } from "@/components/review-inbox";
import { todayIn } from "@/lib/dates/plain-date";
import { DEFAULT_ALERT_OFFSETS } from "@/lib/domain/alerts";
import { listHref, parseListFilters } from "@/lib/domain/filters";
import { TABS_COOKIE, tabsEnabledFrom } from "@/lib/tabs-pref";
import { demoProposals, demoView } from "./demo-data";

// Reading searchParams makes this render per request, so "today" is never stale.
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const sp = await searchParams;
  const { show } = sp;
  const filters = parseListFilters(sp);
  const tabsEnabled = tabsEnabledFrom((await cookies()).get(TABS_COOKIE)?.value);
  const linkFilters = { cat: tabsEnabled ? filters.category : null, q: filters.q, scope: filters.scope };
  const showArchived = show === "cancelled";
  const today = todayIn("Europe/Berlin", new Date());
  const { groups, totals } = demoView(today);
  const pendingCount = demoProposals(today).length;

  return (
    <main className="flex flex-1 flex-col">
      <RenewalsList
        groups={groups}
        totals={totals}
        hrefFor={(r) => `/demo/${r.input.key}`}
        showArchived={showArchived}
        inbox={<ReviewInbox count={pendingCount} href="/demo/review" />}
        alertOffsets={[...DEFAULT_ALERT_OFFSETS]}
        filters={filters}
        tabsEnabled={tabsEnabled}
        basePath="/demo"
      />
      {groups.archived.length > 0 && (
        <div className="pb-8">
          <Link
            href={listHref("/demo", { ...linkFilters, showCancelled: !showArchived })}
            className="link inline-flex min-h-10 items-center text-sm"
          >
            {showArchived ? "Hide cancelled" : "Show cancelled"}
          </Link>
        </div>
      )}
    </main>
  );
}
