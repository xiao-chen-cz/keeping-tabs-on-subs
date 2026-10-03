import Link from "next/link";
import { notFound } from "next/navigation";
import { SubscriptionDetail } from "@/components/subscription-detail";
import { requireUser } from "@/lib/dal/auth";
import { getProfile } from "@/lib/dal/profile";
import { getSubscription } from "@/lib/dal/subscriptions";
import { todayIn } from "@/lib/dates/plain-date";
import { computeSubscription } from "@/lib/domain/compute";

export default async function SubscriptionPage({ params }: PageProps<"/subscriptions/[id]">) {
  await requireUser();
  const { id } = await params;
  const [profile, subscription] = await Promise.all([getProfile(), getSubscription(id)]);
  if (!subscription) notFound();
  const row = computeSubscription(subscription, todayIn(profile.timeZone, new Date()));

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md px-4 pt-2">
        <Link href="/" className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400">
          Back to list
        </Link>
      </div>
      <SubscriptionDetail row={row} editHref={`/subscriptions/${subscription.id}/edit`} />
    </main>
  );
}
