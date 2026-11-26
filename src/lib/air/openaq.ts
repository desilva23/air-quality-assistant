import "server-only";
// OpenAQ gathers measurements from monitoring networks, including CPCB's
// stations across India. The app uses the nearest station that has reported
// PM2.5 recently.

import { z } from "../zod";
import type { Reading } from "../domain/air";
import { distanceKm, type Coordinates } from "../domain/geo";
import { fetchJson, urlWith } from "./fetch-json";

const BASE_URL = "https://api.openaq.org/v3";
export const SEARCH_RADIUS_KM = 25;
export const MAX_AGE_HOURS = 3;
const PM25_PARAMETER_ID = "2";
const MICROGRAMS = "µg/m³";

const Timestamp = z.iso.datetime({ offset: true });

const LocationSchema = z.object({
  id: z.int(),
  name: z.string().nullish(),
  provider: z.object({ name: z.string() }).nullish(),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
  datetimeLast: z.object({ utc: Timestamp }).nullish(),
  sensors: z.array(
    z.object({ id: z.int(), parameter: z.object({ name: z.string(), units: z.string() }) }),
  ),
});

const LocationsReplySchema = z.object({ results: z.array(LocationSchema) });

const LatestReplySchema = z.object({
  results: z.array(
    z.object({ datetime: z.object({ utc: Timestamp }), value: z.number(), sensorsId: z.int() }),
  ),
});

type Location = z.infer<typeof LocationSchema>;
type Latest = z.infer<typeof LatestReplySchema>["results"];

const isFresh = (utc: string, now: number): boolean =>
  now - Date.parse(utc) <= MAX_AGE_HOURS * 3_600_000;

/** Plausible concentrations only; networks sometimes report placeholders like -999. */
const plausible = (value: number): boolean => value >= 0 && value <= 2000;

function nearestFresh(locations: Location[], point: Coordinates, now: number) {
  return locations
    .filter((location) => location.datetimeLast && isFresh(location.datetimeLast.utc, now))
    .map((location) => ({ location, km: distanceKm(point, location.coordinates) }))
    .sort((a, b) => a.km - b.km)[0];
}

/** The latest fresh, plausible value of `parameter` at this location, if any. */
function latestValue(location: Location, latest: Latest, parameter: string, now: number) {
  const sensors = new Set(
    location.sensors
      .filter((s) => s.parameter.name === parameter && s.parameter.units === MICROGRAMS)
      .map((s) => s.id),
  );
  return latest.find(
    (entry) =>
      sensors.has(entry.sensorsId) && plausible(entry.value) && isFresh(entry.datetime.utc, now),
  );
}

/** The nearest station's latest reading, or null when none within range reported recently. */
export async function stationReading(
  point: Coordinates,
  apiKey: string,
  now: number = Date.now(),
): Promise<Reading | null> {
  const options = { source: "OpenAQ", headers: { "X-API-Key": apiKey } };
  const search = urlWith(`${BASE_URL}/locations`, {
    coordinates: `${String(point.latitude)},${String(point.longitude)}`,
    radius: String(SEARCH_RADIUS_KM * 1000),
    parameters_id: PM25_PARAMETER_ID,
    limit: "20",
  });
  const nearest = nearestFresh(
    (await fetchJson(search, LocationsReplySchema, options)).results,
    point,
    now,
  );
  if (!nearest) return null;
  const { location, km } = nearest;
  const latestUrl = new URL(`${BASE_URL}/locations/${String(location.id)}/latest`);
  const { results } = await fetchJson(latestUrl, LatestReplySchema, options);
  const pm25 = latestValue(location, results, "pm25", now);
  if (!pm25) return null;
  return {
    pm25: pm25.value,
    pm10: latestValue(location, results, "pm10", now)?.value ?? null,
    measuredAt: pm25.datetime.utc,
    kind: "station",
    source: `OpenAQ (${location.provider?.name.slice(0, 50) ?? "monitoring network"})`,
    station: location.name?.slice(0, 120) ?? null,
    distanceKm: Math.round(km * 10) / 10,
  };
}
