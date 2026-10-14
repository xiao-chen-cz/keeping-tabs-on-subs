import { notFound, redirect } from "next/navigation";
import { ReviewScreen } from "@/components/review-screen";
import { missingFromValues, proposalFormValues } from "@/components/review-values";
import { requireUser } from "@/lib/dal/auth";
import { listCategories, listPaymentMethods } from "@/lib/dal/lookups";
import { captureFileUrl } from "@/lib/dal/captures";
import { getProposalForReview } from "@/lib/dal/proposals";
import { getProfile } from "@/lib/dal/profile";
import { todayIn } from "@/lib/dates/plain-date";
import { approveProposalAction, detachProposalAction, rejectProposalAction } from "../actions";
import Link from "next/link";

export default async function ReviewProposalPage({ params }: PageProps<"/review/[id]">) {
  await requireUser();
  const { id } = await params;
  const [found, categories, paymentMethods, profile] = await Promise.all([
    getProposalForReview(id),
    listCategories(),
    listPaymentMethods(),
    getProfile(),
  ]);
  if (!found) notFound();
  if (found.proposal.status !== "pending") redirect("/review");

  const initialValues = proposalFormValues(found.proposal, found.existing);
  const cap = found.capture;
  const fileUrl = cap?.storagePath ? await captureFileUrl(cap.storagePath) : null;
  return (
    <main className="flex flex-1 flex-col gap-1">
      <Link href="/review" className="link inline-flex min-h-10 items-center text-sm">
        Back to review
      </Link>
      <ReviewScreen
        proposal={found.proposal}
        updatesName={found.existing?.subscription.name ?? null}
        existing={found.existing?.subscription ?? null}
        captureText={cap?.rawText ?? null}
        captureFile={fileUrl && cap?.mimeType ? { url: fileUrl, mimeType: cap.mimeType } : null}
        extractionError={cap?.extractionError ?? null}
        initialValues={initialValues}
        today={todayIn(profile.timeZone, new Date())}
        questions={missingFromValues(initialValues)}
        lookups={{ categories, paymentMethods }}
        approveAction={approveProposalAction.bind(null, id)}
        rejectAction={rejectProposalAction.bind(null, id)}
        detachAction={detachProposalAction.bind(null, id)}
      />
    </main>
  );
}
