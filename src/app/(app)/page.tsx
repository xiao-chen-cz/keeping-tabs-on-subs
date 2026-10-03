import Link from "next/link";
import { RenewalsList } from "@/components/renewals-list";
import { requireUser } from "@/lib/dal/auth";
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

  const [profile, subscriptions] = await Promise.all([getProfile(), listSubscriptions()]);
  const today = todayIn(profile.timeZone, new Date());
  const rows = subscriptions.map((s) => computeSubscription(s, today));
  const groups = groupAndSort(rows);
  const totals = totalsByCurrency(rows);

  return (
    <main className="flex flex-1 flex-col">
      <RenewalsList
        groups={groups}
        totals={totals}
        hrefFor={(r) => `/subscriptions/${r.input.id}`}
        addHref="/subscriptions/new"
        showArchived={showArchived}
        alertOffsets={profile.reminderOffsets}
      />
      {groups.archived.length > 0 && (
        <div className="mx-auto w-full max-w-md px-4 pb-28">
          <Link
            href={showArchived ? "/" : "/?show=cancelled"}
            className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400"
          >
            {showArchived ? "Hide cancelled" : "Show cancelled"}
          </Link>
        </div>
      )}
    </main>
  );
}
