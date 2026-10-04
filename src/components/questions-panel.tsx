"use client";
import type { ReactNode } from "react";
import { QUESTIONS } from "@/lib/domain/questions";
import type { RequiredField } from "@/lib/domain/proposal";
import { applyAnswer, FIELD_FOR_QUESTION, isAnswered as defaultIsAnswered } from "./review-values";
import type { FormValues } from "./subscription-form-values";
import { isPlainDate } from "@/lib/dates/plain-date";
import { formatDayLong } from "./format";

export type AnsweredFn = (values: FormValues, field: RequiredField) => boolean;

/** Form fields of the questions still open for these values: drives the "Missing" marks in the form. */
export function openFormFields(
  questions: readonly RequiredField[],
  values: FormValues,
  isAnswered: AnsweredFn = defaultIsAnswered,
) {
  return questions.filter((f) => !isAnswered(values, f)).map((f) => FIELD_FOR_QUESTION[f]);
}

function QuestionBlock({
  field,
  values,
  answered,
  onChange,
}: {
  field: RequiredField;
  values: FormValues;
  answered: boolean;
  onChange: (next: FormValues) => void;
}) {
  const q = QUESTIONS[field];
  const formField = FIELD_FOR_QUESTION[field];
  const value = values[formField];
  const set = (answer: string) => onChange(applyAnswer(values, field, answer));
  let control: ReactNode;
  let shown = value;
  if (q.input === "options") {
    shown = q.options.find((o) => o.value === value)?.label ?? value;
    control = (
      <div className="flex flex-wrap gap-2" role="group" aria-label={q.prompt}>
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => set(o.value)}
            className={value === o.value ? "btn-primary" : "btn-secondary"}
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
        value={value}
        onChange={(e) => set(e.target.value)}
        type={q.input === "date" ? "date" : "text"}
        inputMode={q.input === "decimal" ? "decimal" : undefined}
        placeholder={q.input === "decimal" ? "9.99" : undefined}
        autoComplete="off"
        className="input"
      />
    );
  }
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-control border p-3 ${
        answered ? "border-green bg-green-light" : "border-warn-line bg-warn-bg"
      }`}
      data-question={field}
      data-state={answered ? "answered" : "missing"}
    >
      <p className="text-sm font-medium text-text">
        {answered ? (
          <span className="pill mr-2 border-green bg-green-light text-green-ink">answered</span>
        ) : (
          <span className="pill mr-2 border-warn-line bg-warn-bg text-warn-ink">Missing</span>
        )}
        {q.prompt}
      </p>
      {answered && shown !== "" && <p className="text-xs text-green-ink">Answered: {isPlainDate(shown) ? formatDayLong(shown) : shown}</p>}
      {control}
    </div>
  );
}

/** The fixed questions for missing fields. Shared by the review screen and the Needs update screen. */
export function QuestionsPanel({
  questions,
  values,
  onChange,
  isAnswered = defaultIsAnswered,
}: {
  questions: readonly RequiredField[];
  values: FormValues;
  onChange: (next: FormValues) => void;
  isAnswered?: AnsweredFn;
}) {
  if (questions.length === 0) return null;
  const open = questions.filter((f) => !isAnswered(values, f)).length;
  return (
    <section aria-labelledby="questions-heading" className="flex flex-col gap-3">
      <h2 id="questions-heading" className="section-label">
        {open === 0 ? "All answered" : `${open} missing`}
      </h2>
      {questions.map((f) => (
        <QuestionBlock key={f} field={f} values={values} answered={isAnswered(values, f)} onChange={onChange} />
      ))}
    </section>
  );
}
