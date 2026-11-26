"use client";

import { memo, useMemo } from "react";
import type { AirReport, Reading } from "@/lib/domain/air";
import {
  AQI_CATEGORIES,
  CATEGORY_HEALTH,
  CATEGORY_LABEL,
  indianAqi,
  type AqiCategory,
} from "@/lib/domain/aqi";
import { cigarettesPerDay, WHO_PM25_DAILY, whoMultiple } from "@/lib/domain/exposure";
import { formatClock } from "@/lib/domain/time";
import { OutlookChart } from "./OutlookChart";

export interface AirNowProps {
  report: AirReport;
}

/** The six bands of the index, with today's marked. Decorative: the category is also in text. */
function AqiScale({ category }: { category: AqiCategory }) {
  return (
    <ol className="aqi-scale" aria-hidden="true">
      {AQI_CATEGORIES.map((band) => (
        <li key={band} className={`band-${band}${band === category ? " current" : ""}`} />
      ))}
    </ol>
  );
}

function SourceDetails({ reading }: { reading: Reading }) {
  const where =
    reading.kind === "station"
      ? `${reading.station ?? "Monitoring station"}, ${String(reading.distanceKm)} km away`
      : "Model estimate for this spot";
  return (
    <dl className="readings">
      <div>
        <dt>PM2.5</dt>
        <dd>{Math.round(reading.pm25)} µg/m³</dd>
      </div>
      {reading.pm10 !== null && (
        <div>
          <dt>PM10</dt>
          <dd>{Math.round(reading.pm10)} µg/m³</dd>
        </div>
      )}
      <div>
        <dt>Source</dt>
        <dd>{reading.source}</dd>
      </div>
      <div>
        <dt>Where</dt>
        <dd>{where}</dd>
      </div>
      <div>
        <dt>{reading.kind === "station" ? "Measured" : "For"}</dt>
        <dd>
          <time dateTime={reading.measuredAt}>{formatClock(reading.measuredAt)} IST</time>
        </dd>
      </div>
    </dl>
  );
}

/** Today's index, what it means for health, and exactly where the numbers came from. */
export const AirNow = memo(function AirNow({ report }: AirNowProps) {
  const { reading } = report;
  const aqi = useMemo(() => indianAqi(reading), [reading]);
  const cigarettes = cigarettesPerDay(reading.pm25);
  const who = whoMultiple(reading.pm25);

  return (
    <div className="air-now">
      <div className={`aqi aqi-${aqi.category}`}>
        <p className="aqi-headline" role="status">
          <span className="aqi-number">{aqi.value}</span>
          <span className="aqi-label">{CATEGORY_LABEL[aqi.category]}</span>
        </p>
        <AqiScale category={aqi.category} />
        <p className="muted small">
          Indicative AQI on India&apos;s national scale (0–500), set by{" "}
          {aqi.dominant === "pm25" ? "PM2.5" : "PM10"}.
        </p>
      </div>
      <p className="health">{CATEGORY_HEALTH[aqi.category]}</p>
      <p className="who">
        {who > 1 ? (
          <>
            PM2.5 is <strong>{who}×</strong> the WHO 24-hour guideline ({WHO_PM25_DAILY} µg/m³).
          </>
        ) : (
          <>PM2.5 is within the WHO 24-hour guideline ({WHO_PM25_DAILY} µg/m³).</>
        )}
      </p>
      <SourceDetails reading={reading} />
      {report.note && <p className="note">{report.note}</p>}
      <p className="small">
        If the air stayed like this all day, breathing it would do roughly the harm of smoking{" "}
        <strong>{cigarettes} cigarettes</strong> (Berkeley Earth&apos;s rule of thumb: 22 µg/m³ of
        PM2.5 for a day ≈ one cigarette).
      </p>
      <OutlookChart outlook={report.outlook} source={report.outlookSource} />
    </div>
  );
});
