import { cookies } from "next/headers";
import Link from "next/link";
import { RenewalsList } from "@/components/renewals-list";
import { requireUser } from "@/lib/dal/auth";
import { countPendingProposals } from "@/lib/dal/proposals";
import { getProfile } from "@/lib/dal/profile";
import { listSubscriptions } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { computeSubscription } from "@/lib/domain/compute";
import { subscriptionHref } from "@/lib/domain/needs-update";
import { listHref, parseListFilters } from "@/lib/domain/filters";
import { TABS_COOKIE, tabsEnabledFrom } from "@/lib/tabs-pref";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";

export default async function Home({ searchParams }: PageProps<"/">) {
  await requireUser();
  const sp = await searchParams;
  const { show } = sp;
  const filters = parseListFilters(sp);
  const tabsEnabled = tabsEnabledFrom((await cookies()).get(TABS_COOKIE)?.value);
  const linkFilters = { cat: tabsEnabled ? filters.category : null, q: filters.q, scope: filters.scope };
  const showArchived = show === "cancelled";

  const [profile, subscriptions, pendingCount] = await Promise.all([
    getProfile(),
    listSubscriptions(),
    countPendingProposals(),
  ]);
  const today = todayIn(profile.timeZone, new Date());
  const rows = subscriptions.map((s) => computeSubscription(s, today));
  const groups = groupAndSort(rows);
  const totals = totalsByCurrency(rows);

  return (
    <main className="flex flex-1 flex-col">
      {pendingCount > 0 && (
        <Link href="/review" className="btn-primary mb-4 w-full">
          Review ({pendingCount})
        </Link>
      )}
      <RenewalsList
        groups={groups}
        totals={totals}
        hrefFor={(r) => subscriptionHref(r.input.id, r.computed.tags.needsUpdate)}
        addHref="/subscriptions/new"
        showArchived={showArchived}
        alertOffsets={profile.reminderOffsets}
        filters={filters}
        tabsEnabled={tabsEnabled}
        basePath="/"
      />
      {groups.archived.length > 0 && (
        <div className="pb-24">
          <Link href={listHref("/", { ...linkFilters, showCancelled: !showArchived })} className="link inline-flex min-h-10 items-center text-sm">
            {showArchived ? "Hide cancelled" : "Show cancelled"}
          </Link>
        </div>
      )}
    </main>
  );
}
