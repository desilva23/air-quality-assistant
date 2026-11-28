"use client";

import { useId, useState, type SubmitEvent } from "react";
import { MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH, type PlanRequest } from "@/lib/ai/contracts";
import { askQuestion, useApiCall } from "@/lib/client/api";
import { useMessages } from "./i18n";
import { SourceNote } from "./SourceNote";

export interface AskPanelProps {
  /** Today's air and household; questions are answered against them. */
  context: PlanRequest;
}

/** Free-text questions about today, answered for this household from the live data. */
export function AskPanel({ context }: Readonly<AskPanelProps>) {
  const id = useId();
  const m = useMessages();
  const [question, setQuestion] = useState("");
  const ask = useApiCall(askQuestion);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (text.length >= MIN_QUESTION_LENGTH) void ask.run({ ...context, question: text });
  }

  return (
    <div className="ask">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor={id}>{m.ask.question}</label>
          <textarea
            id={id}
            rows={2}
            value={question}
            minLength={MIN_QUESTION_LENGTH}
            maxLength={MAX_QUESTION_LENGTH}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>
        <div className="examples">
          <span className="small">{m.ask.try}</span>
          {m.ask.examples.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => setQuestion(example)}
            >
              {example}
            </button>
          ))}
        </div>
        <button type="submit" className="button primary" disabled={ask.loading}>
          {ask.loading ? m.ask.thinking : m.ask.ask}
        </button>
      </form>
      <div role="status" className="answer">
        {ask.error && <p className="error">{m.errors[ask.error]}</p>}
        {ask.data && (
          <>
            <SourceNote source={ask.data.source} notice={ask.data.notice} />
            <p>{ask.data.data.answer}</p>
            {ask.data.data.tips.length > 0 && (
              <ul>
                {ask.data.data.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
