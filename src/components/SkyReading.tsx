"use client";

import { memo, type Ref } from "react";
import type { Place, Reading } from "@/lib/domain/air";
import { AQI_CATEGORIES, type AqiResult } from "@/lib/domain/aqi";
import { formatClock } from "@/lib/domain/time";
import { useLabels, useLanguage, useMessages } from "./i18n";

export interface SkyReadingProps {
  place: Place;
  aqi: AqiResult | null;
  reading: Reading | null;
  ref?: Ref<HTMLDivElement>;
}

/** Today's index on the sky band: the number people came for, and where it came from. */
export const SkyReading = memo(function SkyReading({ place, aqi, reading, ref }: SkyReadingProps) {
  const { sky } = useMessages();
  const labels = useLabels();
  const language = useLanguage();
  const source = (current: Reading): string => {
    const time = formatClock(current.measuredAt, language);
    return current.kind === "station"
      ? sky.measured(current.station ?? sky.aStation, current.distanceKm, time)
      : sky.modelled(time);
  };
  return (
    <div className="sky-reading" ref={ref}>
      <p className="sky-place">{sky.rightNow(place.name)}</p>
      {aqi && reading ? (
        <>
          <p className="aqi-headline" role="status">
            <span className="aqi-number">{aqi.value}</span>
            <span className="aqi-label">{labels.category[aqi.category]}</span>
          </p>
          <ol className="aqi-scale" aria-hidden="true">
            {AQI_CATEGORIES.map((band) => (
              <li key={band} className={`band-${band}${band === aqi.category ? " current" : ""}`} />
            ))}
          </ol>
          <p className="sky-source">{source(reading)}</p>
          <p className="sky-note">{sky.scale(aqi.dominant === "pm25" ? "PM2.5" : "PM10")}</p>
        </>
      ) : (
        <p className="sky-waiting">{sky.waiting}</p>
      )}
    </div>
  );
});
