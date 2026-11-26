"use client";

import { useId, useState, type SubmitEvent } from "react";
import { MAX_QUESTION_LENGTH, type PlanRequest } from "@/lib/ai/contracts";
import { askQuestion, useApiCall } from "@/lib/client/api";
import { SourceNote } from "./SourceNote";

export interface AskPanelProps {
  /** Today's air and household; questions are answered against them. */
  context: PlanRequest;
}

const EXAMPLES = [
  "Can my kids play outside this evening?",
  "When should I open the windows today?",
  "Is it safe to go for a run tomorrow morning?",
];

/** Free-text questions about today, answered for this household from the live data. */
export function AskPanel({ context }: AskPanelProps) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const ask = useApiCall(askQuestion);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (text.length >= 3) void ask.run({ ...context, question: text });
  }

  return (
    <div className="ask">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor={id}>Your question</label>
          <textarea
            id={id}
            rows={2}
            value={question}
            minLength={3}
            maxLength={MAX_QUESTION_LENGTH}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>
        <div className="examples">
          <span className="small">Try:</span>
          {EXAMPLES.map((example) => (
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
          {ask.loading ? "Thinking…" : "Ask"}
        </button>
      </form>
      <div role="status" className="answer">
        {ask.error && <p className="error">{ask.error}</p>}
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
