"use client";

import { memo, useId, useMemo } from "react";
import { compareModes } from "@/lib/domain/choices";
import { formatKg, formatRupees } from "@/lib/domain/emissions";
import type { Household } from "@/lib/domain/household";
import { useLabels, useMessages } from "./i18n";

export interface CommutePanelProps {
  household: Household;
}

/** The trip shown when the household hasn't set a commute. */
const SAMPLE_KM = 10;
const SAMPLE_DAYS = 5;

/** Every way to make the household's commute, with CO₂, petrol, time and street air. */
export const CommutePanel = memo(function CommutePanel({ household }: CommutePanelProps) {
  const { commute: c, household: h } = useMessages();
  const labels = useLabels();
  const captionId = useId();
  const { mode, distanceKm, daysPerWeek } = household.commute;
  const commuting = mode !== "none" && distanceKm > 0 && daysPerWeek > 0;
  const km = commuting ? distanceKm : SAMPLE_KM;
  const days = commuting ? daysPerWeek : SAMPLE_DAYS;
  const rows = useMemo(() => compareModes(km, days), [km, days]);
  const most = Math.max(...rows.map((row) => row.kgPerWeek));

  return (
    <section aria-labelledby="commute-heading" className="card span-all">
      <h2 id="commute-heading">{c.heading}</h2>
      <p className="muted" id={captionId}>
        {commuting ? c.trip(km, days) : `${c.sample} ${c.trip(km, days)}`}
      </p>
      <div className="table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
        <table className="modes">
          <thead>
            <tr>
              <th scope="col">{c.mode}</th>
              <th scope="col">{c.co2}</th>
              <th scope="col">{c.petrol}</th>
              <th scope="col">{c.time}</th>
              <th scope="col">{c.streetAir}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.mode} className={row.mode === mode ? "yours" : undefined}>
                <th scope="row">
                  {labels.mode[row.mode]} {row.mode === mode && <span>{c.yours}</span>}
                </th>
                <td>
                  <span className="co2-bar" aria-hidden="true">
                    <span style={{ width: `${String((row.kgPerWeek / most) * 100)}%` }} />
                  </span>
                  {formatKg(row.kgPerWeek)} kg
                </td>
                <td>{row.rupeesPerWeek === null ? "–" : formatRupees(row.rupeesPerWeek)}</td>
                <td>
                  {row.minutesPerDay} {h.minutes}
                </td>
                <td>{row.openAir ? c.yes : c.no}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
