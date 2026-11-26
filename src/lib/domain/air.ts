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

const Concentration = z.number().min(0).max(2000);
const Timestamp = z.iso.datetime({ offset: true });

const ReadingSchema = z.object({
  pm25: Concentration,
  pm10: Concentration.nullable(),
  measuredAt: Timestamp,
  /** A monitoring station's measurement, or a model's estimate for the spot. */
  kind: z.enum(["station", "model"]),
  source: z.string().max(80),
  station: z.string().max(120).nullable(),
  distanceKm: z.number().min(0).max(100).nullable(),
});

const OutlookHourSchema = z.object({ time: Timestamp, pm25: Concentration });

export const AirReportSchema = z.object({
  reading: ReadingSchema,
  /** Hourly PM2.5 forecast from the current hour, up to 48 hours. */
  outlook: z.array(OutlookHourSchema).max(48),
  outlookSource: z.string().max(80).nullable(),
  /** Why a fallback source was used, when one was. */
  note: z.string().max(200).nullable(),
});

export type Place = z.infer<typeof PlaceSchema>;
export type Reading = z.infer<typeof ReadingSchema>;
export type OutlookHour = z.infer<typeof OutlookHourSchema>;
export type AirReport = z.infer<typeof AirReportSchema>;
