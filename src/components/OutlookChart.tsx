"use client";

import { memo, useMemo, useState } from "react";
import type { OutlookHour } from "@/lib/domain/air";
import { categoryForPm25 } from "@/lib/domain/aqi";
import { formatClock, formatHour } from "@/lib/domain/time";
import { cleanestWindow } from "@/lib/domain/timing";
import type { Labels } from "@/lib/i18n/labels";
import type { Language } from "@/lib/i18n/language";
import { useLabels, useLanguage, useMessages } from "./i18n";
import { outlookScale, PM25_DAILY_LIMIT } from "./outlook-scale";

export interface OutlookChartProps {
  outlook: OutlookHour[];
  source: string | null;
}

function describe(hour: OutlookHour, labels: Labels, language: Language): string {
  const category = labels.category[categoryForPm25(hour.pm25)];
  return `${formatClock(hour.time, language)}, ${String(Math.round(hour.pm25))} µg/m³ (${category})`;
}

/** The next 24 hours of forecast PM2.5, with the cleanest waking hour picked out. */
export const OutlookChart = memo(function OutlookChart({ outlook, source }: OutlookChartProps) {
  const { chart } = useMessages();
  const labels = useLabels();
  const language = useLanguage();
  const day = useMemo(() => outlook.slice(0, 24), [outlook]);
  const scale = useMemo(() => outlookScale(day), [day]);
  const best = useMemo(() => cleanestWindow(day), [day]);
  const [active, setActive] = useState<OutlookHour | null>(null);

  if (!day.length) return <p className="note">{chart.none}</p>;
  const bestHour = day.find((hour) => hour.time === best?.start);
  const values = day.map((hour) => Math.round(hour.pm25));
  const cleanest = bestHour ? chart.cleanest(describe(bestHour, labels, language)) : "";
  const summary = [chart.summary(day.length, Math.min(...values), Math.max(...values)), cleanest]
    .filter(Boolean)
    .join(" ");

  return (
    <figure className="outlook">
      <figcaption>
        <strong>{chart.caption}</strong> (µg/m³){source && <> · {source}</>}
      </figcaption>
      <p className="outlook-readout">{active ? describe(active, labels, language) : cleanest}</p>
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
          <span>{chart.limit}</span>
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
          <li key={hour.time}>{index % 4 === 0 ? formatHour(hour.time, language) : ""}</li>
        ))}
      </ol>
      <details className="outlook-table">
        <summary>{chart.table}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{chart.time}</th>
              <th scope="col">PM2.5 (µg/m³)</th>
              <th scope="col">{chart.category}</th>
            </tr>
          </thead>
          <tbody>
            {day.map((hour) => (
              <tr key={hour.time}>
                <td>{formatClock(hour.time, language)}</td>
                <td>{Math.round(hour.pm25)}</td>
                <td>{labels.category[categoryForPm25(hour.pm25)]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
});
