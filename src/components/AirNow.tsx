"use client";

import { memo, useMemo } from "react";
import type { AirReport, Reading } from "@/lib/domain/air";
import { CATEGORY_HEALTH, indianAqi } from "@/lib/domain/aqi";
import { cigarettesPerDay, WHO_PM25_DAILY, whoMultiple } from "@/lib/domain/exposure";
import { formatClock } from "@/lib/domain/time";
import { OutlookChart } from "./OutlookChart";

export interface AirNowProps {
  report: AirReport;
}

function SourceDetails({ reading }: { reading: Reading }) {
  const where =
    reading.kind === "station"
      ? `${reading.station ?? "Monitoring station"}, ${String(reading.distanceKm)} km away`
      : "Model estimate for this spot";
  return (
    <dl className="readings">
      <div className="tile">
        <dt>PM2.5</dt>
        <dd>{Math.round(reading.pm25)} µg/m³</dd>
      </div>
      {reading.pm10 !== null && (
        <div className="tile">
          <dt>PM10</dt>
          <dd>{Math.round(reading.pm10)} µg/m³</dd>
        </div>
      )}
      <div className="tile wide">
        <dt>Source</dt>
        <dd>{reading.source}</dd>
      </div>
      <div className="tile wide">
        <dt>Where</dt>
        <dd>{where}</dd>
      </div>
      <div className="tile">
        <dt>{reading.kind === "station" ? "Measured" : "For"}</dt>
        <dd>
          <time dateTime={reading.measuredAt}>{formatClock(reading.measuredAt)} IST</time>
        </dd>
      </div>
    </dl>
  );
}

/** What today's air means for health, exactly where the numbers came from, and the day ahead. */
export const AirNow = memo(function AirNow({ report }: AirNowProps) {
  const { reading } = report;
  const aqi = useMemo(() => indianAqi(reading), [reading]);
  const cigarettes = cigarettesPerDay(reading.pm25);
  const who = whoMultiple(reading.pm25);

  return (
    <div className="air-now">
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
