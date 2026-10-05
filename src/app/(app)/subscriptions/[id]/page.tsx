import Link from "next/link";
import { notFound } from "next/navigation";
import { KeptForRenewal } from "@/components/alert-actions";
import { SubscriptionDetail } from "@/components/subscription-detail";
import { requireUser } from "@/lib/dal/auth";
import { listEvents } from "@/lib/dal/events";
import { getCaptureForSubscription } from "@/lib/dal/proposals";
import { getProfile } from "@/lib/dal/profile";
import { getSubscription } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { computeSubscription } from "@/lib/domain/compute";
import { undoKeepAction } from "../../alerts/actions";
import { reopenSubscriptionAction } from "../actions";

export default async function SubscriptionPage({ params }: PageProps<"/subscriptions/[id]">) {
  await requireUser();
  const { id } = await params;
  const [profile, subscription, events, capture] = await Promise.all([
    getProfile(),
    getSubscription(id),
    listEvents(id),
    getCaptureForSubscription(id),
  ]);
  if (!subscription) notFound();
  const row = computeSubscription(subscription, todayIn(profile.timeZone, new Date()));
  // Only a Keep for the current renewal can be undone; an old one has already expired by itself.
  const keptNow =
    subscription.status === "confirmed" && subscription.keptForCancelBy !== null && subscription.keptForCancelBy === row.computed.cancelBy;

  return (
    <main className="flex flex-1 flex-col">
      <Link href="/" className="link inline-flex min-h-10 items-center text-sm">
        Back to list
      </Link>
      {keptNow && (
        <KeptForRenewal cancelBy={subscription.keptForCancelBy!} remindAgain={undoKeepAction.bind(null, subscription.id, "detail")} />
      )}
      <SubscriptionDetail
        row={row}
        completeHref={`/subscriptions/${subscription.id}/complete`}
        editHref={`/subscriptions/${subscription.id}/edit`}
        cancelHref={`/subscriptions/${subscription.id}/cancel`}
        reopenAction={reopenSubscriptionAction.bind(null, subscription.id)}
        events={events}
        captureText={capture ? (capture.rawText ?? "A file was uploaded for this entry.") : null}
      />
    </main>
  );
}
