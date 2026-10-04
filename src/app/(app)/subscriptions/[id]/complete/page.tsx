import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompleteScreen } from "@/components/complete-screen";
import { formValuesFromSubscription } from "@/components/subscription-form-values";
import { requireUser } from "@/lib/dal/auth";
import { listCategories, listPaymentMethods } from "@/lib/dal/lookups";
import { getProfile } from "@/lib/dal/profile";
import { getSubscriptionForEdit } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { computeSubscription } from "@/lib/domain/compute";
import { missingForSchedule } from "@/lib/domain/needs-update";
import { updateSubscriptionAction } from "../../actions";

export default async function CompleteSubscriptionPage({ params }: PageProps<"/subscriptions/[id]/complete">) {
  await requireUser();
  const { id } = await params;
  const [profile, existing, categories, paymentMethods] = await Promise.all([
    getProfile(),
    getSubscriptionForEdit(id),
    listCategories(),
    listPaymentMethods(),
  ]);
  if (!existing) notFound();
  const today = todayIn(profile.timeZone, new Date());
  const { computed } = computeSubscription(existing.subscription, today);
  if (!computed.tags.needsUpdate) redirect(`/subscriptions/${id}`);

  return (
    <main className="flex flex-1 flex-col gap-1">
      <Link href={`/subscriptions/${id}`} className="link inline-flex min-h-10 items-center text-sm">
        Back to subscription
      </Link>
      <CompleteScreen
        name={existing.subscription.name}
        initialValues={formValuesFromSubscription(existing.subscription, existing)}
        questions={missingForSchedule(existing.subscription)}
        lookups={{ categories, paymentMethods }}
        action={updateSubscriptionAction.bind(null, id)}
        detailHref={`/subscriptions/${id}`}
        trialEndedHref={`/subscriptions/${id}/cancel?reason=trial-ended`}
      />
    </main>
  );
}
