import Link from "next/link";
import { RenewalsList } from "@/components/renewals-list";
import { requireUser } from "@/lib/dal/auth";
import { countPendingProposals } from "@/lib/dal/proposals";
import { getProfile } from "@/lib/dal/profile";
import { listSubscriptions } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { computeSubscription } from "@/lib/domain/compute";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";

export default async function Home({ searchParams }: PageProps<"/">) {
  await requireUser();
  const { show } = await searchParams;
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
        hrefFor={(r) => `/subscriptions/${r.input.id}`}
        addHref="/subscriptions/new"
        showArchived={showArchived}
        alertOffsets={profile.reminderOffsets}
      />
      {groups.archived.length > 0 && (
        <div className="pb-24">
          <Link href={showArchived ? "/" : "/?show=cancelled"} className="link inline-flex min-h-10 items-center text-sm">
            {showArchived ? "Hide cancelled" : "Show cancelled"}
          </Link>
        </div>
      )}
    </main>
  );
}
