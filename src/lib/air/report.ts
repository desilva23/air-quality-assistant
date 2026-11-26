import "server-only";
import type { AirReport, Reading } from "../domain/air";
import type { Coordinates } from "../domain/geo";
import { openAqKey } from "../server/config";
import { UpstreamError } from "./fetch-json";
import { modelAir, MODEL_SOURCE, type ModelAir } from "./open-meteo";
import { MAX_AGE_HOURS, SEARCH_RADIUS_KM, stationReading } from "./openaq";

type Outcome<T> = PromiseSettledResult<T>;

const MODEL_NOTE = "so this is the CAMS model's estimate for the spot.";

/** The value of a settled call, or null after logging why it failed. */
function valueOf<T>(outcome: Outcome<T>): T | null {
  if (outcome.status === "fulfilled") return outcome.value;
  const reason: unknown = outcome.reason;
  console.error(`[air] ${reason instanceof Error ? reason.message : "UnknownError"}`);
  return null;
}

/** Why the reading isn't from a station, in words the user can act on. */
function noteFor(station: Outcome<Reading | null> | null): string {
  if (!station) return `Station readings aren't set up on this server, ${MODEL_NOTE}`;
  if (station.status === "rejected") return `The station network didn't respond, ${MODEL_NOTE}`;
  return `No monitoring station within ${String(SEARCH_RADIUS_KM)} km reported in the last ${String(MAX_AGE_HOURS)} hours, ${MODEL_NOTE}`;
}

function forecastFrom(modelled: ModelAir | null): Pick<AirReport, "outlook" | "outlookSource"> {
  return { outlook: modelled?.outlook ?? [], outlookSource: modelled ? MODEL_SOURCE : null };
}

/**
 * The air at a point: the nearest fresh station reading when there is one, the
 * model's estimate otherwise, and the model's hourly forecast either way. Both
 * sources are asked at once.
 */
export async function airReport(point: Coordinates, now: number = Date.now()): Promise<AirReport> {
  const key = openAqKey();
  const [station, model] = await Promise.allSettled([
    key ? stationReading(point, key, now) : Promise.resolve(null),
    modelAir(point),
  ]);
  const measured = valueOf(station);
  const modelled = valueOf(model);
  if (measured) return { reading: measured, ...forecastFrom(modelled), note: null };
  if (!modelled) throw new UpstreamError("No air data source answered");
  return {
    reading: modelled.current,
    ...forecastFrom(modelled),
    note: noteFor(key ? station : null),
  };
}
