"use client";

import { memo, type Ref } from "react";
import type { Place, Reading } from "@/lib/domain/air";
import { AQI_CATEGORIES, CATEGORY_LABEL, type AqiResult } from "@/lib/domain/aqi";
import { formatClock } from "@/lib/domain/time";

export interface SkyReadingProps {
  place: Place;
  aqi: AqiResult | null;
  reading: Reading | null;
  ref?: Ref<HTMLDivElement>;
}

function sourceLine(reading: Reading): string {
  const time = `${formatClock(reading.measuredAt)} IST`;
  return reading.kind === "station"
    ? `Measured at ${reading.station ?? "a monitoring station"}, ${String(reading.distanceKm)} km away, at ${time}`
    : `Model estimate for this spot at ${time}`;
}

/** Today's index on the sky band: the number people came for, and where it came from. */
export const SkyReading = memo(function SkyReading({ place, aqi, reading, ref }: SkyReadingProps) {
  return (
    <div className="sky-reading" ref={ref}>
      <p className="sky-place">{place.name} right now</p>
      {aqi && reading ? (
        <>
          <p className="aqi-headline" role="status">
            <span className="aqi-number">{aqi.value}</span>
            <span className="aqi-label">{CATEGORY_LABEL[aqi.category]}</span>
          </p>
          <ol className="aqi-scale" aria-hidden="true">
            {AQI_CATEGORIES.map((band) => (
              <li key={band} className={`band-${band}${band === aqi.category ? " current" : ""}`} />
            ))}
          </ol>
          <p className="sky-source">{sourceLine(reading)}</p>
          <p className="sky-note">
            Indicative AQI on India&apos;s national scale (0–500), set by{" "}
            {aqi.dominant === "pm25" ? "PM2.5" : "PM10"}.
          </p>
        </>
      ) : (
        <p className="sky-waiting">Reading the air…</p>
      )}
    </div>
  );
});
