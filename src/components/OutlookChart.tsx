"use client";

import { memo, useMemo, useState } from "react";
import type { OutlookHour } from "@/lib/domain/air";
import { CATEGORY_LABEL, categoryForPm25 } from "@/lib/domain/aqi";
import { formatClock, formatHour } from "@/lib/domain/time";
import { cleanestWindow } from "@/lib/domain/timing";
import { outlookScale, PM25_DAILY_LIMIT } from "./outlook-scale";

export interface OutlookChartProps {
  outlook: OutlookHour[];
  source: string | null;
}

const describe = (hour: OutlookHour): string =>
  `${formatClock(hour.time)}, ${String(Math.round(hour.pm25))} µg/m³ (${CATEGORY_LABEL[categoryForPm25(hour.pm25)]})`;

/** One sentence a screen reader reads in place of the chart. */
function summarise(day: OutlookHour[], bestHour: OutlookHour | undefined): string {
  const values = day.map((hour) => Math.round(hour.pm25));
  const range = `ranges from ${String(Math.min(...values))} to ${String(Math.max(...values))} µg/m³`;
  const best = bestHour ? ` Cleanest waking hour: ${describe(bestHour)}.` : "";
  return `Forecast PM2.5 for the next ${String(day.length)} hours ${range}.${best}`;
}

/** The next 24 hours of forecast PM2.5, with the cleanest waking hour picked out. */
export const OutlookChart = memo(function OutlookChart({ outlook, source }: OutlookChartProps) {
  const day = useMemo(() => outlook.slice(0, 24), [outlook]);
  const scale = useMemo(() => outlookScale(day), [day]);
  const best = useMemo(() => cleanestWindow(day), [day]);
  const [active, setActive] = useState<OutlookHour | null>(null);

  if (!day.length) {
    return <p className="note">No hourly forecast is available for this place right now.</p>;
  }
  const bestHour = day.find((hour) => hour.time === best?.start);
  const summary = summarise(day, bestHour);

  return (
    <figure className="outlook">
      <figcaption>
        <strong>PM2.5 forecast, next 24 hours</strong> (µg/m³){source && <> · {source}</>}
      </figcaption>
      <p className="outlook-readout">
        {active ? describe(active) : bestHour ? `Cleanest waking hour: ${describe(bestHour)}` : ""}
      </p>
      <div className="outlook-plot" role="img" aria-label={summary}>
        {scale.ticks.map((tick) => (
          <div
            key={tick}
            className="gridline"
            style={{ bottom: `${String(scale.percent(tick))}%` }}
          >
            <span>{tick}</span>
          </div>
        ))}
        <div className="limit" style={{ bottom: `${String(scale.percent(PM25_DAILY_LIMIT))}%` }}>
          <span>India&apos;s 24-hour limit</span>
        </div>
        <ol className="bars" onPointerLeave={() => setActive(null)}>
          {day.map((hour) => (
            <li
              key={hour.time}
              className={hour.time === best?.start ? "best" : undefined}
              onPointerEnter={() => setActive(hour)}
            >
              <span className="bar" style={{ height: `${String(scale.percent(hour.pm25))}%` }} />
            </li>
          ))}
        </ol>
      </div>
      <ol className="outlook-axis" aria-hidden="true">
        {day.map((hour, index) => (
          <li key={hour.time}>{index % 4 === 0 ? formatHour(hour.time) : ""}</li>
        ))}
      </ol>
      <details className="outlook-table">
        <summary>Show the hourly values as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Time (IST)</th>
              <th scope="col">PM2.5 (µg/m³)</th>
              <th scope="col">Category</th>
            </tr>
          </thead>
          <tbody>
            {day.map((hour) => (
              <tr key={hour.time}>
                <td>{formatClock(hour.time)}</td>
                <td>{Math.round(hour.pm25)}</td>
                <td>{CATEGORY_LABEL[categoryForPm25(hour.pm25)]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
});
