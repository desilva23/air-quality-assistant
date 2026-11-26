"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import type { NearbyStation } from "@/lib/domain/air";
import { categoryForPm25, type AqiCategory } from "@/lib/domain/aqi";
import type { Coordinates } from "@/lib/domain/geo";

export interface StationMapProps {
  centre: Coordinates;
  stations: NearbyStation[];
  /** Says what the map shows, for screen readers. */
  label: string;
}

/** CPCB's band colours, for the station dots; the table beside the map names each band. */
const BAND_COLOUR: Record<AqiCategory, string> = {
  good: "#2e9e4f",
  satisfactory: "#9ccc4c",
  moderate: "#f2d43d",
  poor: "#f29b30",
  "very-poor": "#e0412f",
  severe: "#9b1c1c",
};

/** OpenStreetMap's own tiles: no key, light use, credited. Dark mode dims them in CSS. */
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The stations around the chosen place on a map. Leaflet loads only when this
 * renders, so it stays out of the first page load.
 */
export function StationMap({ centre, stations, label }: StationMapProps) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      const element = box.current;
      if (cancelled || !element) return;
      map = leaflet.map(element, { scrollWheelZoom: false });
      leaflet.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(map);
      const points: [number, number][] = [[centre.latitude, centre.longitude]];
      for (const station of stations) {
        points.push([station.latitude, station.longitude]);
        leaflet
          .circleMarker([station.latitude, station.longitude], {
            radius: 9,
            color: "#ffffff",
            weight: 2,
            fillColor: BAND_COLOUR[categoryForPm25(station.pm25)],
            fillOpacity: 0.95,
          })
          .bindTooltip(`${station.name}: ${String(Math.round(station.pm25))} µg/m³`)
          .addTo(map);
      }
      leaflet
        .circleMarker([centre.latitude, centre.longitude], {
          radius: 7,
          color: "#ffffff",
          weight: 3,
          fillColor: "#11507a",
          fillOpacity: 1,
        })
        .addTo(map);
      map.fitBounds(points, { padding: [24, 24], maxZoom: 13 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [centre.latitude, centre.longitude, stations]);

  return <div ref={box} className="station-map" role="region" aria-label={label} />;
}
