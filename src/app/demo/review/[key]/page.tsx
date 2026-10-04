import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReviewScreen } from "@/components/review-screen";
import { missingFromValues, proposalFormValues } from "@/components/review-values";
import { todayIn } from "@/lib/dates/plain-date";
import { DEMO_LOOKUPS, demoProposal } from "../../demo-data";

// Read-only: no server action is imported here; ReviewScreen runs with readOnly.
export default async function DemoReviewProposalPage({ params }: PageProps<"/demo/review/[key]">) {
  await connection(); // today changes daily: never prerender
  const { key } = await params;
  const found = demoProposal(key, todayIn("Europe/Berlin", new Date()));
  if (!found) notFound();

  const initialValues = proposalFormValues(found.proposal, found.existing);
  return (
    <main className="flex flex-1 flex-col gap-1">
      <Link href="/demo/review" className="link inline-flex min-h-10 items-center text-sm">
        Back to review
      </Link>
      <ReviewScreen
        readOnly
        backHref="/demo/review"
        proposal={found.proposal}
        updatesName={found.existing?.subscription.name ?? null}
        captureText={found.captureText}
        initialValues={initialValues}
        questions={missingFromValues(initialValues)}
        lookups={DEMO_LOOKUPS}
      />
    </main>
  );
}
