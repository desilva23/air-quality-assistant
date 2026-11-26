"use client";

import { memo } from "react";
import type { AirReport, Reading } from "@/lib/domain/air";
import type { AqiResult } from "@/lib/domain/aqi";
import { cigarettesPerDay, whoMultiple } from "@/lib/domain/exposure";
import { formatClock } from "@/lib/domain/time";
import { useLabels, useLanguage, useMessages } from "./i18n";
import { OutlookChart } from "./OutlookChart";

export interface AirNowProps {
  report: AirReport;
  aqi: AqiResult;
}

function SourceDetails({ reading }: { reading: Reading }) {
  const { air } = useMessages();
  const language = useLanguage();
  const where =
    reading.kind === "station"
      ? air.away(reading.station ?? air.station, reading.distanceKm)
      : air.modelSpot;
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
        <dt>{air.source}</dt>
        <dd>{reading.source}</dd>
      </div>
      <div className="tile wide">
        <dt>{air.where}</dt>
        <dd>{where}</dd>
      </div>
      <div className="tile">
        <dt>{reading.kind === "station" ? air.measured : air.forTime}</dt>
        <dd>
          <time dateTime={reading.measuredAt}>{formatClock(reading.measuredAt, language)} IST</time>
        </dd>
      </div>
    </dl>
  );
}

/** What today's air means for health, exactly where the numbers came from, and the day ahead. */
export const AirNow = memo(function AirNow({ report, aqi }: AirNowProps) {
  const { air } = useMessages();
  const labels = useLabels();
  const { reading } = report;
  const who = whoMultiple(reading.pm25);

  return (
    <div className="air-now">
      <p className="health">{labels.health[aqi.category]}</p>
      <p className="who">{who > 1 ? air.who(who) : air.withinWho}</p>
      <SourceDetails reading={reading} />
      {report.note && <p className="note">{air.notes[report.note]}</p>}
      <p className="small">{air.cigarettes(cigarettesPerDay(reading.pm25))}</p>
      <OutlookChart outlook={report.outlook} source={report.outlookSource} />
    </div>
  );
});
