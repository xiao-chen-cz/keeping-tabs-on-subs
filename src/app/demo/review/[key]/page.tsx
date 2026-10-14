import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReviewScreen } from "@/components/review-screen";
import { missingFromValues, proposalFormValues } from "@/components/review-values";
import { todayIn } from "@/lib/dates/plain-date";
import { DEMO_LOOKUPS, demoProposal } from "../../demo-data";

// Read-only: no server action is imported here; ReviewScreen runs with readOnly.
export default async function DemoReviewProposalPage({ params, searchParams }: PageProps<"/demo/review/[key]">) {
  await connection(); // today changes daily: never prerender
  const { key } = await params;
  const today = todayIn("Europe/Berlin", new Date());
  const found = demoProposal(key, today);
  if (!found) notFound();

  // ?as=new shows an update proposal as a new entry (client-side view only, nothing is saved).
  const asNew = (await searchParams).as === "new";
  const existing = asNew ? null : found.existing;
  const initialValues = proposalFormValues(found.proposal, existing);
  return (
    <main className="flex flex-1 flex-col gap-1">
      <Link href="/demo/review" className="link inline-flex min-h-10 items-center text-sm">
        Back to review
      </Link>
      <ReviewScreen
        key={asNew ? "new" : "update"}
        readOnly
        backHref="/demo/review"
        proposal={found.proposal}
        updatesName={existing?.subscription.name ?? null}
        existing={existing?.subscription ?? null}
        asNewHref={`/demo/review/${found.key}?as=new`}
        captureText={found.captureText}
        initialValues={initialValues}
        today={today}
        questions={missingFromValues(initialValues)}
        lookups={DEMO_LOOKUPS}
      />
    </main>
  );
}
