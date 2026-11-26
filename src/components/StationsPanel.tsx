"use client";

import { lazy, memo, Suspense, useEffect } from "react";
import type { StationsReply } from "@/lib/air/contracts";
import { fetchStations, useApiCall } from "@/lib/client/api";
import type { NearbyStation, Place } from "@/lib/domain/air";
import { categoryForPm25 } from "@/lib/domain/aqi";
import { formatClock } from "@/lib/domain/time";
import { useLabels, useLanguage, useMessages } from "./i18n";

const StationMap = lazy(() => import("./StationMap").then((m) => ({ default: m.StationMap })));

export interface StationsPanelProps {
  place: Place;
}

function StationsTable({ stations }: { stations: NearbyStation[] }) {
  const { stations: s, air } = useMessages();
  const labels = useLabels();
  const language = useLanguage();
  return (
    <div className="table-scroll" role="region" aria-label={s.table} tabIndex={0}>
      <table className="stations">
        <thead>
          <tr>
            <th scope="col">{s.station}</th>
            <th scope="col">{s.distance}</th>
            <th scope="col">PM2.5</th>
            <th scope="col">{s.band}</th>
            <th scope="col">{air.measured}</th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station) => {
            const band = categoryForPm25(station.pm25);
            return (
              <tr key={`${station.name}|${String(station.latitude)}`}>
                <th scope="row">{station.name}</th>
                <td>{s.km(station.distanceKm)}</td>
                <td>{Math.round(station.pm25)}</td>
                <td>
                  <span className={`swatch band-${band}`} aria-hidden="true" />
                  {labels.category[band]}
                </td>
                <td>{formatClock(station.measuredAt, language)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Why there is nothing to map: station readings are off, or none nearby is fresh. */
function emptyNote(reply: StationsReply | undefined, off: string, none: string): string | null {
  if (!reply || reply.stations.length) return null;
  return reply.enabled ? none : off;
}

/** Every recently reporting station near the place, on a map and in a table. */
export const StationsPanel = memo(function StationsPanel({ place }: StationsPanelProps) {
  const { stations: s, errors } = useMessages();
  const lookup = useApiCall(fetchStations);
  const load = lookup.run;
  useEffect(() => {
    void load(place);
  }, [place, load]);

  const reply = lookup.status === "done" ? lookup.data : undefined;
  const list = reply?.stations ?? [];
  const note = emptyNote(reply, s.off, s.none);
  return (
    <section aria-labelledby="stations-heading" className="card stations-card">
      <h2 id="stations-heading">{s.heading}</h2>
      {lookup.loading && <p role="status">{s.loading}</p>}
      {lookup.error && (
        <p role="alert" className="error">
          {errors[lookup.error]}
        </p>
      )}
      {note && <p className="note">{note}</p>}
      {list.length > 0 && (
        <>
          <p className="muted">{s.intro(list.length)}</p>
          <Suspense fallback={<div className="station-map" />}>
            <StationMap centre={place} stations={list} label={s.map} />
          </Suspense>
          <StationsTable stations={list} />
        </>
      )}
    </section>
  );
});
