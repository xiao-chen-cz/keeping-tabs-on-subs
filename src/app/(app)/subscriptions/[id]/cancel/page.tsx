import { notFound, redirect } from "next/navigation";
import { CancelIntro } from "@/components/cancel-intro";
import { CancelForm } from "@/components/cancel-form";
import { requireUser } from "@/lib/dal/auth";
import { getProfile } from "@/lib/dal/profile";
import { getSubscription } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { trialEndedPrefill } from "@/lib/domain/needs-update";
import { cancelSubscriptionAction } from "../../actions";

export default async function CancelSubscriptionPage({ params, searchParams }: PageProps<"/subscriptions/[id]/cancel">) {
  const user = await requireUser();
  const { id } = await params;
  const { reason } = await searchParams;
  const [profile, subscription] = await Promise.all([getProfile(), getSubscription(id)]);
  if (!subscription) notFound();
  if (subscription.status !== "confirmed") redirect(`/subscriptions/${id}`);

  const today = todayIn(profile.timeZone, new Date());
  // From an alert: pre-select Website / app when the vendor's cancel page is known (logic-spec §3.2).
  const initial =
    reason === "trial-ended"
      ? trialEndedPrefill(subscription.trialEnds, today)
      : reason === "alert" && subscription.cancelUrl
        ? { channel: "website_app" }
        : undefined;

  return (
    <main className="flex flex-1 flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Cancel {subscription.name}</h1>
      <CancelIntro cancelUrl={subscription.cancelUrl} accountLabel={subscription.accountLabel} />
      <CancelForm
        action={cancelSubscriptionAction.bind(null, id)}
        userId={user.id}
        today={today}
        initial={initial}
        cancelHref={`/subscriptions/${id}`}
      />
    </main>
  );
}
