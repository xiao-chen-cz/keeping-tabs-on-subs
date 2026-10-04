"use client";
import { useState } from "react";
import type { RequiredField } from "@/lib/domain/proposal";
import { confidenceFlags as flagsFor, isAnswered } from "./review-values";
import { openFormFields, QuestionsPanel } from "./questions-panel";
import { SubscriptionForm, type LookupOption } from "./subscription-form";
import type { FormValues, SubscriptionFormState } from "./subscription-form-values";
import type { Proposal } from "@/lib/dal/map-proposal";

export interface ReviewScreenProps {
  proposal: Proposal;
  /** Name of the subscription this proposal updates, if any. */
  updatesName: string | null;
  /** Capture text, or null for a file capture or a missing capture. */
  captureText: string | null;
  initialValues: FormValues;
  /** Required fields still empty in initialValues: fixed at load, so answered questions stay visible. */
  questions: RequiredField[];
  lookups: { categories: LookupOption[]; paymentMethods: LookupOption[] };
  /** Omitted in the public demo (readOnly). */
  approveAction?: (prev: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  rejectAction?: () => Promise<void>;
  /** Public demo: answers work in client state only; no actions, no Reject, Approve disabled. */
  readOnly?: boolean;
  /** Where Cancel / back goes; defaults to the signed-in queue. */
  backHref?: string;
}

export function ReviewScreen({
  proposal,
  updatesName,
  captureText,
  initialValues,
  questions,
  lookups,
  approveAction,
  rejectAction,
  readOnly,
  backHref = "/review",
}: ReviewScreenProps) {
  const [vals, setVals] = useState<FormValues>(initialValues);
  const allAnswered = questions.every((f) => isAnswered(vals, f));

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">{vals.name.trim() || "Unnamed"}</h1>
      {updatesName && (
        <p className="rounded-control border border-primary-ink/30 bg-primary-light p-3 text-sm text-primary-ink">
          This will update {updatesName}.
        </p>
      )}

      <details className="rounded-control border border-line p-3 text-sm">
        <summary className="min-h-8 cursor-pointer font-medium">What the app read</summary>
        {captureText ? (
          <p className="mt-2 whitespace-pre-wrap break-words">{captureText}</p>
        ) : (
          <p className="mt-2 text-mid">No text for this capture.</p>
        )}
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
        confidenceFlags={flagsFor(proposal.draft.fieldConfidence)}
      />

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
