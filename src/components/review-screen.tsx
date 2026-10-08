"use client";
import { useState } from "react";
import type { RequiredField } from "@/lib/domain/proposal";
import Link from "next/link";
import { confidenceFlags as flagsFor, isAnswered, proposalChanges } from "./review-values";
import { openFormFields, QuestionsPanel } from "./questions-panel";
import { SubscriptionForm, type LookupOption } from "./subscription-form";
import type { FormValues, SubscriptionFormState } from "./subscription-form-values";
import type { Proposal } from "@/lib/dal/map-proposal";
import type { Subscription } from "@/lib/domain/types";
import { CaptureView, type CaptureFile } from "./capture-view";

export interface ReviewScreenProps {
  proposal: Proposal;
  /** Name of the subscription this proposal updates, if any. */
  updatesName: string | null;
  /** The subscription an update proposal would change, to show what differs. */
  existing?: Subscription | null;
  /** Capture text, or null for a file capture or a missing capture. */
  captureText: string | null;
  /** An uploaded picture or PDF (signed link), when the capture was a file. */
  captureFile?: CaptureFile | null;
  /** Why the model could not read the capture: the fields are then empty for the user to fill in. */
  extractionError?: string | null;
  initialValues: FormValues;
  /** Required fields still empty in initialValues: fixed at load, so answered questions stay visible. */
  questions: RequiredField[];
  lookups: { categories: LookupOption[]; paymentMethods: LookupOption[] };
  /** Omitted in the public demo (readOnly). */
  approveAction?: (prev: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  rejectAction?: () => Promise<void>;
  /** Turns an update proposal into a new-entry proposal ("Add as a separate subscription"). */
  detachAction?: () => Promise<void>;
  /** Demo: link that shows the same proposal as a new entry, client-side only. */
  asNewHref?: string;
  /** Public demo: answers work in client state only; no actions, no Reject, Approve disabled. */
  readOnly?: boolean;
  /** Where Cancel / back goes; defaults to the signed-in queue. */
  backHref?: string;
}

export function ReviewScreen({
  proposal,
  updatesName,
  existing = null,
  captureText,
  captureFile = null,
  extractionError = null,
  initialValues,
  questions,
  lookups,
  approveAction,
  rejectAction,
  detachAction,
  asNewHref,
  readOnly,
  backHref = "/review",
}: ReviewScreenProps) {
  const [vals, setVals] = useState<FormValues>(initialValues);
  const changes = existing ? proposalChanges(proposal, existing) : [];
  const allAnswered = questions.every((f) => isAnswered(vals, f));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">{vals.name.trim() || "Unnamed"}</h1>
      {!readOnly && (
        <p className="text-sm text-mid">
          {updatesName ? "Check the change, then approve it." : "Not in your list yet. Check the fields, then approve or reject."}
        </p>
      )}
      {extractionError && (
        <p role="status" className="rounded-control border border-line bg-light p-3 text-sm">
          The app could not read this capture ({extractionError.replace(/\.$/, "")}). Fill in the fields yourself, or
          reject it.
        </p>
      )}
      {updatesName && (
        <div className="rounded-control border border-primary-ink/30 bg-primary-light p-3 text-sm text-primary-ink">
          <p>This will update {updatesName}.</p>
          {changes.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5">
              {changes.map((c) => (
                <li key={c.key} data-tone={c.tone} className={c.tone === "rise" ? "font-medium text-danger" : undefined}>
                  {c.key === "amount" ? "Price changed" : c.label}: {c.from} → {c.to}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <details className="rounded-control border border-line p-3 text-sm">
        <summary className="min-h-8 cursor-pointer font-medium">What the app read</summary>
        <CaptureView text={captureText} file={captureFile} />
      </details>

      <QuestionsPanel questions={questions} values={vals} onChange={setVals} />

      <SubscriptionForm
        mode="create"
        action={approveAction}
        readOnly={readOnly}
        initialValues={initialValues}
        values={vals}
        onValuesChange={setVals}
        lookups={lookups}
        cancelHref={backHref}
        hideStatus
        missingFields={openFormFields(questions, vals)}
        submitLabel="Approve"
        submitDisabled={!allAnswered}
        actionsAtTop
        confidenceFlags={flagsFor(proposal.draft.fieldConfidence)}
      />

      {updatesName && (detachAction || asNewHref) && (
        <section className="rounded-control border border-line p-3 text-sm">
          <h2 className="font-medium">Not the same subscription?</h2>
          {detachAction ? (
            <form action={detachAction} className="mt-2">
              <button type="submit" className="btn-secondary">Add as a separate subscription</button>
            </form>
          ) : (
            <Link href={asNewHref!} className="btn-secondary mt-2 inline-flex">
              Add as a separate subscription
            </Link>
          )}
        </section>
      )}

      {!readOnly && (
      <form action={rejectAction} className="pb-8">
        <button
          type="submit"
          className="btn-secondary"
        >
          Reject
        </button>
        <p className="mt-1 text-xs text-mid">Rejecting discards this proposal. Nothing is added to your list.</p>
      </form>
      )}
    </div>
  );
}
