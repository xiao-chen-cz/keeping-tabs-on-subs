import Link from "next/link";
import { connection } from "next/server";
import { missingFromValues, proposalFormValues } from "@/components/review-values";
import { todayIn } from "@/lib/dates/plain-date";
import { formatMoney } from "@/lib/domain/totals";
import { demoProposals } from "../demo-data";

export default async function DemoReviewQueuePage() {
  await connection(); // today changes daily: never prerender
  const pending = demoProposals(todayIn("Europe/Berlin", new Date()));

  return (
    <main className="flex flex-1 flex-col gap-3">
      <Link href="/demo" className="link inline-flex min-h-10 items-center text-sm">
        Back to list
      </Link>
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Review</h1>
      <ul className="flex flex-col">
        {pending.map(({ key, proposal, existing }) => {
          const d = proposal.draft;
          const questions = missingFromValues(proposalFormValues(proposal, existing)).length;
          return (
            <li key={key}>
              <Link
                href={`/demo/review/${key}`}
                className="flex flex-col gap-0.5 border-b border-line py-3 active:bg-light"
              >
                <span className="font-semibold">{d.name ?? "Unnamed"}</span>
                {d.amountCents !== null && d.currency !== null && (
                  <span className="text-sm text-mid">{formatMoney(d.amountCents, d.currency)}</span>
                )}
                {existing && <span className="text-sm text-accent-dark">Update to {existing.subscription.name}</span>}
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
    </main>
  );
}
