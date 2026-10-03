"use client";
import { useState, type ReactNode } from "react";
import { QUESTIONS } from "@/lib/domain/questions";
import type { RequiredField } from "@/lib/domain/proposal";
import { applyAnswer, confidenceFlags as flagsFor, FIELD_FOR_QUESTION, isAnswered } from "./review-values";
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
  approveAction: (prev: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  rejectAction: () => Promise<void>;
}

const inputClass =
  "w-full min-h-12 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-base dark:border-zinc-700";

function QuestionBlock({
  field,
  values,
  onChange,
}: {
  field: RequiredField;
  values: FormValues;
  onChange: (next: FormValues) => void;
}) {
  const q = QUESTIONS[field];
  const formField = FIELD_FOR_QUESTION[field];
  const answered = isAnswered(values, field);
  const set = (answer: string) => onChange(applyAnswer(values, field, answer));
  let control: ReactNode;
  if (q.input === "options") {
    control = (
      <div className="flex flex-wrap gap-2" role="group" aria-label={q.prompt}>
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={values[formField] === o.value}
            onClick={() => set(o.value)}
            className={`min-h-12 rounded-full border px-4 text-base ${
              values[formField] === o.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  } else {
    control = (
      <input
        aria-label={q.prompt}
        value={values[formField]}
        onChange={(e) => set(e.target.value)}
        type={q.input === "date" ? "date" : "text"}
        inputMode={q.input === "decimal" ? "decimal" : undefined}
        placeholder={q.input === "decimal" ? "9.99" : undefined}
        autoComplete="off"
        className={inputClass}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2" data-question={field}>
      <p className="text-sm font-medium">
        {q.prompt}
        {answered && <span className="ml-2 text-xs text-green-700 dark:text-green-400">answered</span>}
      </p>
      {control}
    </div>
  );
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
}: ReviewScreenProps) {
  const [vals, setVals] = useState<FormValues>(initialValues);
  const allAnswered = questions.every((f) => isAnswered(vals, f));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{vals.name.trim() || "Unnamed"}</h1>
      {updatesName && (
        <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          This will update {updatesName}.
        </p>
      )}

      <details className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <summary className="min-h-8 cursor-pointer font-medium">What the app read</summary>
        {captureText ? (
          <p className="mt-2 whitespace-pre-wrap break-words">{captureText}</p>
        ) : (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">No text for this capture.</p>
        )}
      </details>

      {questions.length > 0 && (
        <section aria-labelledby="questions-heading" className="flex flex-col gap-4">
          <h2 id="questions-heading" className="text-lg font-semibold">
            {questions.length === 1 ? "One question" : `${questions.length} questions`}
          </h2>
          {questions.map((f) => (
            <QuestionBlock key={f} field={f} values={vals} onChange={setVals} />
          ))}
        </section>
      )}

      <SubscriptionForm
        mode="create"
        action={approveAction}
        initialValues={initialValues}
        values={vals}
        onValuesChange={setVals}
        lookups={lookups}
        cancelHref="/review"
        hideStatus
        submitLabel="Approve"
        submitDisabled={!allAnswered}
        confidenceFlags={flagsFor(proposal.draft.fieldConfidence)}
      />

      <form action={rejectAction} className="pb-8">
        <button
          type="submit"
          className="min-h-12 rounded-full border border-zinc-300 px-6 font-medium dark:border-zinc-700"
        >
          Reject
        </button>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Rejecting discards this proposal. Nothing is added to your list.</p>
      </form>
    </div>
  );
}
