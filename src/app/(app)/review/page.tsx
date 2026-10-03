import Link from "next/link";
import { requireUser } from "@/lib/dal/auth";
import { listPendingProposals } from "@/lib/dal/proposals";
import { listSubscriptions } from "@/lib/dal/subscriptions";
import { formatMoney } from "@/lib/domain/totals";
import { missingFromValues, proposalFormValues } from "@/components/review-values";

export default async function ReviewQueuePage() {
  await requireUser();
  const [pending, subscriptions] = await Promise.all([listPendingProposals(), listSubscriptions()]);
  const byId = new Map(subscriptions.map((s) => [s.id, s]));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-2">
      <Link href="/" className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400">
        Back to list
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
      {pending.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">Nothing to review</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map(({ proposal, updatesName }) => {
            const d = proposal.draft;
            const existing = d.updatesSubscriptionId ? byId.get(d.updatesSubscriptionId) : undefined;
            const questions = missingFromValues(
              proposalFormValues(
                proposal,
                existing ? { subscription: existing, categoryId: null, paymentMethodId: null } : null,
              ),
            ).length;
            return (
              <li key={proposal.id}>
                <Link
                  href={`/review/${proposal.id}`}
                  className="flex min-h-12 flex-col gap-1 rounded-lg border border-zinc-200 p-4 active:bg-zinc-50 dark:border-zinc-800 dark:active:bg-zinc-900"
                >
                  <span className="font-medium">{d.name ?? "Unnamed"}</span>
                  {d.amountCents !== null && d.currency !== null && (
                    <span className="text-sm">{formatMoney(d.amountCents, d.currency)}</span>
                  )}
                  {updatesName && <span className="text-sm text-indigo-700 dark:text-indigo-300">Update to {updatesName}</span>}
                  {questions > 0 && (
                    <span className="text-sm text-amber-800 dark:text-amber-300">
                      {questions === 1 ? "1 question" : `${questions} questions`}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
