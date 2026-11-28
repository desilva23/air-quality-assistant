"use client";

import type { CallStatus } from "@/lib/client/api";
import type { AirReport, Place } from "@/lib/domain/air";
import type { AqiResult } from "@/lib/domain/aqi";
import type { ApiErrorCode } from "@/lib/api-errors";
import { AirNow } from "./AirNow";
import { useMessages } from "./i18n";

export interface AirSectionProps {
  place: Place;
  status: CallStatus;
  report: AirReport | undefined;
  aqi: AqiResult | null;
  error: ApiErrorCode | undefined;
  onRetry: () => void;
}

/** Live air for the chosen place, with loading and failure states. */
export function AirSection({
  place,
  status,
  report,
  aqi,
  error,
  onRetry,
}: Readonly<AirSectionProps>) {
  const { air, errors } = useMessages();
  return (
    <section
      aria-labelledby="air-heading"
      className="card air-card"
      aria-busy={status === "loading"}
    >
      <h2 id="air-heading">{air.heading(place.name)}</h2>
      {status === "loading" && <p role="status">{air.loading}</p>}
      {status === "error" && (
        <div role="alert" className="error-box">
          <p>{error && errors[error]}</p>
          <button type="button" className="button secondary" onClick={onRetry}>
            {air.retry}
          </button>
        </div>
      )}
      {report && aqi && <AirNow report={report} aqi={aqi} />}
    </section>
  );
}
