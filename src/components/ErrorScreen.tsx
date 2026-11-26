"use client";

import { useSavedLanguage } from "@/lib/client/saved";
import { MESSAGES } from "@/lib/i18n/messages";

export interface ErrorScreenProps {
  reset: () => void;
}

/** Shown instead of the page when rendering fails. Saved answers stay in the browser. */
export function ErrorScreen({ reset }: ErrorScreenProps) {
  const [language] = useSavedLanguage();
  const { failure } = MESSAGES[language];
  return (
    <main id="main" className="container" tabIndex={-1} lang={language}>
      <div className="card">
        <h1>{failure.title}</h1>
        <p>{failure.body}</p>
        <button type="button" className="button primary" onClick={reset}>
          {failure.retry}
        </button>
      </div>
    </main>
  );
}
