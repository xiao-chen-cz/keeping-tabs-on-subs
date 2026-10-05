import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDay, relativeDays } from "@/components/format";
import { requireUser } from "@/lib/dal/auth";
import { getProfile } from "@/lib/dal/profile";
import { getSubscription } from "@/lib/dal/subscriptions";
import { isPlainDate, todayIn } from "@/lib/dates/plain-date";
import { checkKeep } from "@/lib/domain/alerts";
import { computeSubscription } from "@/lib/domain/compute";
import { keepRenewalAction } from "../actions";

/**
 * Landing page for the Keep / Cancelled links in alert emails (logic-spec §3.2). Opening it never changes
 * anything (mail scanners open links): Keep needs the button below, Cancelled goes to the cancel sheet.
 * `cb` is the cancel-by the email was about; a different current cancel-by makes the link stale (E47).
 */
export default async function AlertPage({ params, searchParams }: PageProps<"/alerts/[id]">) {
  await requireUser();
  const { id } = await params;
  const { cb, do: action } = await searchParams;
  if (typeof cb !== "string" || !isPlainDate(cb)) notFound();
  const [profile, subscription] = await Promise.all([getProfile(), getSubscription(id)]);
  if (!subscription) notFound();
  const row = computeSubscription(subscription, todayIn(profile.timeZone, new Date()));
  const check = checkKeep(row, cb);
  const detailHref = `/subscriptions/${id}`;
  const cancelHref = `/subscriptions/${id}/cancel?reason=alert`;

  if (check === "ok" && action === "cancel") redirect(cancelHref);

  const { cancelBy, daysUntilCancelBy } = row.computed;
  return (
    <main className="flex flex-1 flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">{subscription.name}</h1>
      {check === "not_active" && <p className="text-mid">This subscription is already cancelled. Nothing to do.</p>}
      {check === "stale" && (
        <p className="text-mid">
          This reminder is out of date: it was about the cancel-by {formatDay(cb)}
          {cancelBy ? `, and the cancel-by is now ${formatDay(cancelBy)}` : ""}. Nothing was changed.
        </p>
      )}
      {check === "ok" && subscription.keptForCancelBy === cb && (
        <p className="text-mid">Already kept for this renewal (cancel-by {formatDay(cb)}). No more reminders until the next one.</p>
      )}
      {check === "ok" && subscription.keptForCancelBy !== cb && (
        <>
          <p className="text-mid">
            Cancel by {formatDay(cb)}
            {daysUntilCancelBy !== null ? ` (${relativeDays(daysUntilCancelBy)})` : ""}. Keep it, and you won&apos;t be reminded
            again for this renewal.
          </p>
          <div className="flex gap-2">
            <form action={keepRenewalAction.bind(null, id, cb)}>
              <button type="submit" className="btn-primary">
                Keep
              </button>
            </form>
            <Link href={cancelHref} className="btn-secondary">
              I cancelled it
            </Link>
          </div>
        </>
      )}
      <Link href={detailHref} className="link inline-flex min-h-11 items-center text-sm">
        Open {subscription.name}
      </Link>
    </main>
  );
}
