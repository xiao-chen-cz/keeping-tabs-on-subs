import { notFound, redirect } from "next/navigation";
import { ReviewScreen } from "@/components/review-screen";
import { missingFromValues, proposalFormValues } from "@/components/review-values";
import { requireUser } from "@/lib/dal/auth";
import { listCategories, listPaymentMethods } from "@/lib/dal/lookups";
import { getProposalForReview } from "@/lib/dal/proposals";
import { approveProposalAction, rejectProposalAction } from "../actions";
import Link from "next/link";

export default async function ReviewProposalPage({ params }: PageProps<"/review/[id]">) {
  await requireUser();
  const { id } = await params;
  const [found, categories, paymentMethods] = await Promise.all([
    getProposalForReview(id),
    listCategories(),
    listPaymentMethods(),
  ]);
  if (!found) notFound();
  if (found.proposal.status !== "pending") redirect("/review");

  const initialValues = proposalFormValues(found.proposal, found.existing);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 px-4 py-2">
      <Link href="/review" className="inline-flex min-h-12 items-center text-sm text-zinc-600 underline dark:text-zinc-400">
        Back to review
      </Link>
      <ReviewScreen
        proposal={found.proposal}
        updatesName={found.existing?.subscription.name ?? null}
        captureText={found.capture?.rawText ?? null}
        initialValues={initialValues}
        questions={missingFromValues(initialValues)}
        lookups={{ categories, paymentMethods }}
        approveAction={approveProposalAction.bind(null, id)}
        rejectAction={rejectProposalAction.bind(null, id)}
      />
    </main>
  );
}
