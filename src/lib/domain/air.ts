// The shapes air data takes once it reaches the app, whichever source it came
// from. Every reading carries its source and time, so the interface can say
// where a number came from and how fresh it is.

import { z } from "../zod";
import { INDIA_BOUNDS } from "./geo";

export const PlaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** State or district, when known. */
  region: z.string().max(80).nullable(),
  latitude: z.number().min(INDIA_BOUNDS.minLat).max(INDIA_BOUNDS.maxLat),
  longitude: z.number().min(INDIA_BOUNDS.minLon).max(INDIA_BOUNDS.maxLon),
});

/** How near and how recent a station reading must be to stand for a place. */
export const STATION_RADIUS_KM = 25;
export const STATION_MAX_AGE_HOURS = 3;

/** Above any PM level recorded in India; anything higher is a sensor fault. */
export const MAX_CONCENTRATION = 2000;

const Concentration = z.number().min(0).max(MAX_CONCENTRATION);
const Timestamp = z.iso.datetime({ offset: true });

const readingBase = {
  pm25: Concentration,
  pm10: Concentration.nullable(),
  measuredAt: Timestamp,
  source: z.string().max(80),
};

/** A monitoring station's measurement, or a model's estimate for the spot. */
const ReadingSchema = z.discriminatedUnion("kind", [
  z.object({
    ...readingBase,
    kind: z.literal("station"),
    station: z.string().max(120).nullable(),
    distanceKm: z.number().min(0).max(100),
  }),
  z.object({ ...readingBase, kind: z.literal("model"), station: z.null(), distanceKm: z.null() }),
]);

const OutlookHourSchema = z.object({ time: Timestamp, pm25: Concentration });

const AIR_NOTES = ["stations-off", "stations-down", "no-fresh-station"] as const;

export type AirNote = (typeof AIR_NOTES)[number];

export const AirReportSchema = z.object({
  reading: ReadingSchema,
  /** Hourly PM2.5 forecast from the current hour, up to 48 hours. */
  outlook: z.array(OutlookHourSchema).max(48),
  outlookSource: z.string().max(80).nullable(),
  /** Why the model stood in for a station, when it did. A code; the browser words it. */
  note: z.enum(AIR_NOTES).nullable(),
});

/** A monitoring station near the chosen place, with its latest PM2.5, for the map. */
export const NearbyStationSchema = z.object({
  name: z.string().max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceKm: z.number().min(0).max(100),
  pm25: Concentration,
  measuredAt: Timestamp,
});

export type NearbyStation = z.infer<typeof NearbyStationSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Reading = z.infer<typeof ReadingSchema>;
export type OutlookHour = z.infer<typeof OutlookHourSchema>;
export type AirReport = z.infer<typeof AirReportSchema>;
