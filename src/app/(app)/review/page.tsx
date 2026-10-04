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
    <main className="flex flex-1 flex-col gap-3">
      <Link href="/" className="link inline-flex min-h-10 items-center text-sm">
        Back to list
      </Link>
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Review</h1>
      {pending.length === 0 ? (
        <p className="text-mid">Nothing to review</p>
      ) : (
        <ul className="flex flex-col">
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
                  className="flex flex-col gap-0.5 border-b border-line py-3 active:bg-light"
                >
                  <span className="font-semibold">{d.name ?? "Unnamed"}</span>
                  {d.amountCents !== null && d.currency !== null && (
                    <span className="text-sm text-mid">{formatMoney(d.amountCents, d.currency)}</span>
                  )}
                  {updatesName && <span className="text-sm text-accent-dark">Update to {updatesName}</span>}
                  {questions > 0 && (
                    <span className="text-sm text-warn-ink">
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
