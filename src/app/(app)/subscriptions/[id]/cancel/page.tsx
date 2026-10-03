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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Cancel {subscription.name}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This records that you cancelled with the vendor. It does not cancel anything for you.
        {subscription.cancelUrl && (
          <>
            {" "}
            <a href={subscription.cancelUrl} target="_blank" rel="noopener noreferrer" className="underline">
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
