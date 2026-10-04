"use client";
import Link from "next/link";
import { useState } from "react";
import type { RequiredField } from "@/lib/domain/proposal";
import { isAnswered, FIELD_FOR_QUESTION } from "./review-values";
import { parseAnswer } from "@/lib/domain/questions";
import { openFormFields, QuestionsPanel } from "./questions-panel";
import { SubscriptionForm, type LookupOption } from "./subscription-form";
import type { FormValues, SubscriptionFormState } from "./subscription-form-values";

export interface CompleteScreenProps {
  name: string;
  initialValues: FormValues;
  /** Fixed at load from missingForSchedule, so answered questions stay visible. */
  questions: RequiredField[];
  lookups: { categories: LookupOption[]; paymentMethods: LookupOption[] };
  action: (prev: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  detailHref: string;
  trialEndedHref: string;
}

/** Here the date question fills the billing date only: an expired trial end does not give the row a schedule. */
function answered(values: FormValues, field: RequiredField): boolean {
  if (field === "lastRenewalDate|trialEnds") return parseAnswer(field, values[FIELD_FOR_QUESTION[field]]) !== null;
  return isAnswered(values, field);
}

export function CompleteScreen({
  name,
  initialValues,
  questions,
  lookups,
  action,
  detailHref,
  trialEndedHref,
}: CompleteScreenProps) {
  const [vals, setVals] = useState<FormValues>(initialValues);
  const allAnswered = questions.every((f) => answered(vals, f));
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">{name}</h1>
      <p className="text-sm text-mid">The app can&apos;t work out the next renewal. Answer these to fix it.</p>

      <QuestionsPanel questions={questions} values={vals} onChange={setVals} isAnswered={answered} />

      <SubscriptionForm
        mode="edit"
        action={action}
        initialValues={initialValues}
        values={vals}
        onValuesChange={setVals}
        lookups={lookups}
        cancelHref={detailHref}
        hideStatus
        submitLabel="Save"
        submitDisabled={!allAnswered}
        missingFields={openFormFields(questions, vals, answered)}
      />

      <section className="flex flex-col gap-1 rounded-control border border-line p-3 pb-3">
        <p className="text-sm font-medium text-text">The trial ended and I didn&apos;t continue?</p>
        <Link href={trialEndedHref} className="link inline-flex min-h-11 items-center text-sm">
          Mark as cancelled
        </Link>
      </section>
    </div>
  );
}
