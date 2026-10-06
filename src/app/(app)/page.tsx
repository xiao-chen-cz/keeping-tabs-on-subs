import { cookies } from "next/headers";
import Link from "next/link";
import { AlertActions, KeptNotice, QuietNotice } from "@/components/alert-actions";
import { RenewalsList } from "@/components/renewals-list";
import { ReviewInbox } from "@/components/review-inbox";
import { countKept } from "@/lib/dal/alerts";
import { requireUser } from "@/lib/dal/auth";
import { countPendingProposals } from "@/lib/dal/proposals";
import { getProfile } from "@/lib/dal/profile";
import { listSubscriptions } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { shouldOfferQuiet } from "@/lib/domain/alerts";
import { computeSubscription } from "@/lib/domain/compute";
import { subscriptionHref } from "@/lib/domain/needs-update";
import { listHref, parseListFilters } from "@/lib/domain/filters";
import { TABS_COOKIE, tabsEnabledFrom } from "@/lib/tabs-pref";
import { totalsByCurrency } from "@/lib/domain/totals";
import { groupAndSort } from "@/lib/domain/upcoming";
import { answerQuietOfferAction, keepRenewalAction, undoKeepAction, undoQuietAction } from "./alerts/actions";

export default async function Home({ searchParams }: PageProps<"/">) {
  await requireUser();
  const sp = await searchParams;
  const { show, kept, quiet } = sp;
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
  // After Keep (?kept=<id>) or the quiet offer (?quiet=<id>): a one-off notice for that row.
  const keptRow = typeof kept === "string" ? subscriptions.find((s) => s.id === kept) : undefined;
  const quietRow = typeof quiet === "string" ? subscriptions.find((s) => s.id === quiet) : undefined;
  const offerQuiet = keptRow ? shouldOfferQuiet(keptRow, await countKept(keptRow.id)) : false;

  return (
    <main className="flex flex-1 flex-col">
      {keptRow && (
        <KeptNotice
          name={keptRow.name}
          cancelBy={keptRow.keptForCancelBy}
          undo={undoKeepAction.bind(null, keptRow.id, "list")}
          offer={
            offerQuiet
              ? {
                  accept: answerQuietOfferAction.bind(null, keptRow.id, true),
                  decline: answerQuietOfferAction.bind(null, keptRow.id, false),
                }
              : undefined
          }
        />
      )}
      {quietRow && <QuietNotice name={quietRow.name} undo={undoQuietAction.bind(null, quietRow.id)} />}
      <RenewalsList
        groups={groups}
        totals={totals}
        hrefFor={(r) => subscriptionHref(r.input.id, r.computed.tags.needsUpdate)}
        addHref="/capture"
        showArchived={showArchived}
        inbox={<ReviewInbox count={pendingCount} href="/review" />}
        alertOffsets={profile.reminderOffsets}
        dueActionsFor={(r, cancelBy) => (
          <AlertActions
            name={r.input.name}
            keep={keepRenewalAction.bind(null, r.input.id, cancelBy)}
            cancelHref={`/subscriptions/${r.input.id}/cancel?reason=alert`}
          />
        )}
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
