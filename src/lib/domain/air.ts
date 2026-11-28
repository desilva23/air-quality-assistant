// The shapes air data takes once it reaches the app, whichever source it came
// from. Every reading carries its source and time, so the interface can say
// where a number came from and how fresh it is.

import * as z from "../zod";
import { INDIA_BOUNDS } from "./geo";

/** Longest place, region and station names kept; data sources' longer names are cut to fit. */
export const PLACE_NAME_MAX = 80;
export const STATION_NAME_MAX = 120;

/** Hours of forecast kept, from the current hour. */
export const OUTLOOK_HOURS = 48;

export const PlaceSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1), z.maxLength(PLACE_NAME_MAX)),
  /** State or district, when known. */
  region: z.nullable(z.string().check(z.maxLength(PLACE_NAME_MAX))),
  latitude: z.number().check(z.gte(INDIA_BOUNDS.minLat), z.lte(INDIA_BOUNDS.maxLat)),
  longitude: z.number().check(z.gte(INDIA_BOUNDS.minLon), z.lte(INDIA_BOUNDS.maxLon)),
});

/** How near and how recent a station reading must be to stand for a place. */
export const STATION_RADIUS_KM = 25;
export const STATION_MAX_AGE_HOURS = 3;

/** Above any PM level recorded in India; anything higher is a sensor fault. */
export const MAX_CONCENTRATION = 2000;

const Concentration = z.number().check(z.gte(0), z.lte(MAX_CONCENTRATION));
const Kilometres = z.number().check(z.gte(0), z.lte(100));
const Timestamp = z.iso.datetime({ offset: true });

const readingBase = {
  pm25: Concentration,
  pm10: z.nullable(Concentration),
  measuredAt: Timestamp,
  source: z.string().check(z.maxLength(80)),
};

/** A monitoring station's measurement, or a model's estimate for the spot. */
const ReadingSchema = z.discriminatedUnion("kind", [
  z.object({
    ...readingBase,
    kind: z.literal("station"),
    station: z.nullable(z.string().check(z.maxLength(STATION_NAME_MAX))),
    distanceKm: Kilometres,
  }),
  z.object({ ...readingBase, kind: z.literal("model"), station: z.null(), distanceKm: z.null() }),
]);

const OutlookHourSchema = z.object({ time: Timestamp, pm25: Concentration });

const AIR_NOTES = ["stations-off", "stations-down", "no-fresh-station"] as const;

export type AirNote = (typeof AIR_NOTES)[number];

export const AirReportSchema = z.object({
  reading: ReadingSchema,
  /** Hourly PM2.5 forecast from the current hour. */
  outlook: z.array(OutlookHourSchema).check(z.maxLength(OUTLOOK_HOURS)),
  outlookSource: z.nullable(z.string().check(z.maxLength(80))),
  /** Why the model stood in for a station, when it did. A code; the browser words it. */
  note: z.nullable(z.enum(AIR_NOTES)),
});

/** A monitoring station near the chosen place, with its latest PM2.5, for the map. */
export const NearbyStationSchema = z.object({
  name: z.string().check(z.maxLength(STATION_NAME_MAX)),
  latitude: z.number().check(z.gte(-90), z.lte(90)),
  longitude: z.number().check(z.gte(-180), z.lte(180)),
  distanceKm: Kilometres,
  pm25: Concentration,
  measuredAt: Timestamp,
});

export type NearbyStation = z.infer<typeof NearbyStationSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Reading = z.infer<typeof ReadingSchema>;
export type OutlookHour = z.infer<typeof OutlookHourSchema>;
export type AirReport = z.infer<typeof AirReportSchema>;
