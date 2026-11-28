import "server-only";
// Open-Meteo serves the Copernicus (CAMS) air-quality model for any point,
// with an hourly forecast and no key. It is the app's forecast and its stand-in
// when no monitoring station is near or fresh.

import * as z from "../zod";
import {
  OUTLOOK_HOURS,
  PLACE_NAME_MAX,
  type OutlookHour,
  type Place,
  type Reading,
} from "../domain/air";
import { isInIndia, type Coordinates } from "../domain/geo";
import { fetchJson, UpstreamError, urlWith } from "./fetch-json";

const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export const MODEL_SOURCE = "Open-Meteo (CAMS model)";

/** Wall-clock time in IST, as Open-Meteo gives it when asked for Asia/Kolkata. */
const LocalTime = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/));
const Value = z.nullable(z.number().check(z.gte(0)));

const AirReplySchema = z.object({
  current: z.object({ time: LocalTime, pm2_5: Value, pm10: Value }),
  hourly: z.object({ time: z.array(LocalTime), pm2_5: z.array(Value) }),
});

const GeocodeReplySchema = z.object({
  results: z.optional(
    z.array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country_code: z.string(),
        admin1: z.optional(z.string()),
      }),
    ),
  ),
});

const toIso = (local: string): string => `${local}:00+05:30`;
const hourOf = (local: string): string => local.slice(0, 13);

export interface ModelAir {
  current: Reading;
  outlook: OutlookHour[];
}

export async function modelAir({ latitude, longitude }: Coordinates): Promise<ModelAir> {
  const url = urlWith(AIR_URL, {
    latitude: String(latitude),
    longitude: String(longitude),
    current: "pm2_5,pm10",
    hourly: "pm2_5",
    forecast_days: "3",
    timezone: "Asia/Kolkata",
  });
  const { current, hourly } = await fetchJson(url, AirReplySchema, { source: "Open-Meteo" });
  if (current.pm2_5 === null) throw new UpstreamError("Open-Meteo has no PM2.5 for this place");
  const now = hourOf(current.time);
  const outlook = hourly.time.flatMap((time, index) => {
    const pm25 = hourly.pm2_5[index];
    return hourOf(time) >= now && typeof pm25 === "number" ? [{ time: toIso(time), pm25 }] : [];
  });
  return {
    current: {
      pm25: current.pm2_5,
      pm10: current.pm10,
      measuredAt: toIso(current.time),
      kind: "model",
      source: MODEL_SOURCE,
      station: null,
      distanceKm: null,
    },
    outlook: outlook.slice(0, OUTLOOK_HOURS),
  };
}

/** Towns and cities in India matching `query`, best match first. */
export async function searchPlaces(query: string): Promise<Place[]> {
  const url = urlWith(GEOCODING_URL, {
    name: query,
    count: "8",
    language: "en",
    format: "json",
    countryCode: "IN",
  });
  const { results = [] } = await fetchJson(url, GeocodeReplySchema, { source: "Open-Meteo" });
  return results
    .filter((result) => result.country_code === "IN" && isInIndia(result))
    .map((result) => ({
      name: result.name.slice(0, PLACE_NAME_MAX),
      region: result.admin1?.slice(0, PLACE_NAME_MAX) ?? null,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
}
