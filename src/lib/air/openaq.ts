import "server-only";
// OpenAQ gathers measurements from monitoring networks, including CPCB's
// stations across India. The app uses the nearest station that has reported
// PM2.5 recently.

import * as z from "../zod";
import {
  MAX_CONCENTRATION,
  STATION_MAX_AGE_HOURS,
  STATION_NAME_MAX,
  STATION_RADIUS_KM,
  type NearbyStation,
  type Reading,
} from "../domain/air";
import { distanceKm, type Coordinates } from "../domain/geo";
import { fetchJson, urlWith } from "./fetch-json";

const BASE_URL = "https://api.openaq.org/v3";
const PM25_PARAMETER_ID = "2";
const MICROGRAMS = "µg/m³";

const Timestamp = z.iso.datetime({ offset: true });

const LocationSchema = z.object({
  id: z.int(),
  name: z.nullish(z.string()),
  provider: z.nullish(z.object({ name: z.string() })),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
  datetimeLast: z.nullish(z.object({ utc: Timestamp })),
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
  now - Date.parse(utc) <= STATION_MAX_AGE_HOURS * 3_600_000;

/** Plausible concentrations only; networks sometimes report placeholders like -999. */
const plausible = (value: number): boolean => value >= 0 && value <= MAX_CONCENTRATION;

interface Nearby {
  location: Location;
  km: number;
}

/** Stations that reported recently, nearest first. */
function freshByDistance(locations: Location[], point: Coordinates, now: number): Nearby[] {
  return locations
    .filter((location) => location.datetimeLast && isFresh(location.datetimeLast.utc, now))
    .map((location) => ({ location, km: distanceKm(point, location.coordinates) }))
    .sort((a, b) => a.km - b.km);
}

interface Options {
  source: string;
  headers: Record<string, string>;
}

/** Every PM2.5 station within range of the point. */
async function searchNear(point: Coordinates, options: Options): Promise<Location[]> {
  const search = urlWith(`${BASE_URL}/locations`, {
    coordinates: `${String(point.latitude)},${String(point.longitude)}`,
    radius: String(STATION_RADIUS_KM * 1000),
    parameters_id: PM25_PARAMETER_ID,
    limit: "20",
  });
  return (await fetchJson(search, LocationsReplySchema, options)).results;
}

async function latestAt(location: Location, options: Options): Promise<Latest> {
  const url = new URL(`${BASE_URL}/locations/${String(location.id)}/latest`);
  return (await fetchJson(url, LatestReplySchema, options)).results;
}

const kmRounded = (km: number): number => Math.round(km * 10) / 10;

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
  const [nearest] = freshByDistance(await searchNear(point, options), point, now);
  if (!nearest) return null;
  const { location, km } = nearest;
  const results = await latestAt(location, options);
  const pm25 = latestValue(location, results, "pm25", now);
  if (!pm25) return null;
  return {
    pm25: pm25.value,
    pm10: latestValue(location, results, "pm10", now)?.value ?? null,
    measuredAt: pm25.datetime.utc,
    kind: "station",
    source: `OpenAQ (${location.provider?.name.slice(0, 50) ?? "monitoring network"})`,
    station: location.name?.slice(0, STATION_NAME_MAX) ?? null,
    distanceKm: kmRounded(km),
  };
}

/** Stations drawn on the map: the nearest that reported recently, each with its latest PM2.5. */
export const MAP_STATIONS = 8;

/**
 * The nearest fresh stations with their latest PM2.5, for the map. Their
 * readings are fetched in parallel; a station whose reading fails is left out.
 */
export async function nearbyStations(
  point: Coordinates,
  apiKey: string,
  now: number = Date.now(),
): Promise<NearbyStation[]> {
  const options = { source: "OpenAQ", headers: { "X-API-Key": apiKey } };
  const nearest = freshByDistance(await searchNear(point, options), point, now);
  const readings = await Promise.allSettled(
    nearest.slice(0, MAP_STATIONS).map(async ({ location, km }) => {
      const pm25 = latestValue(location, await latestAt(location, options), "pm25", now);
      return pm25
        ? {
            name: location.name?.slice(0, STATION_NAME_MAX) ?? "",
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude,
            distanceKm: kmRounded(km),
            pm25: pm25.value,
            measuredAt: pm25.datetime.utc,
          }
        : null;
    }),
  );
  return readings.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );
}
