"use client";

import type { AirReport, Place } from "@/lib/domain/air";
import { AirNow } from "./AirNow";

export interface AirSectionProps {
  place: Place;
  status: "idle" | "loading" | "done" | "error";
  report: AirReport | undefined;
  error: string | undefined;
  onRetry: () => void;
}

/** Live air for the chosen place, with loading and failure states. */
export function AirSection({ place, status, report, error, onRetry }: AirSectionProps) {
  return (
    <section aria-labelledby="air-heading" className="card" aria-busy={status === "loading"}>
      <h2 id="air-heading">2. Air in {place.name} now</h2>
      {status === "loading" && <p role="status">Fetching live air data…</p>}
      {status === "error" && (
        <div role="alert" className="error-box">
          <p>{error}</p>
          <button type="button" className="button secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
      {status === "done" && report && <AirNow report={report} />}
    </section>
  );
}
