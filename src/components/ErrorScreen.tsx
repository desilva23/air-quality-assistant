"use client";

export interface ErrorScreenProps {
  reset: () => void;
}

/** Shown instead of the page when rendering fails. Saved answers stay in the browser. */
export function ErrorScreen({ reset }: ErrorScreenProps) {
  return (
    <main id="main" className="container" tabIndex={-1}>
      <div className="card">
        <h1>Something went wrong</h1>
        <p>The assistant hit a problem showing this page. Your saved answers are still here.</p>
        <button type="button" className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
