import { notFound, redirect } from "next/navigation";
import { CancelForm } from "@/components/cancel-form";
import { requireUser } from "@/lib/dal/auth";
import { getProfile } from "@/lib/dal/profile";
import { getSubscription } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { cancelSubscriptionAction } from "../../actions";

export default async function CancelSubscriptionPage({ params }: PageProps<"/subscriptions/[id]/cancel">) {
  await requireUser();
  const { id } = await params;
  const [profile, subscription] = await Promise.all([getProfile(), getSubscription(id)]);
  if (!subscription) notFound();
  if (subscription.status !== "confirmed") redirect(`/subscriptions/${id}`);

  return (
    <main className="flex flex-1 flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Cancel {subscription.name}</h1>
      <p className="text-sm text-mid">
        This records that you cancelled with the vendor. It does not cancel anything for you.
        {subscription.cancelUrl && (
          <>
            {" "}
            <a href={subscription.cancelUrl} target="_blank" rel="noopener noreferrer" className="link">
              Open the vendor&apos;s cancel link
            </a>
          </>
        )}
      </p>
      <CancelForm
        action={cancelSubscriptionAction.bind(null, id)}
        today={todayIn(profile.timeZone, new Date())}
        cancelHref={`/subscriptions/${id}`}
      />
    </main>
  );
}
