// Query and reply shapes for the air-data endpoints, shared by the server
// routes and the browser client.

import * as z from "../zod";
import { NearbyStationSchema, PlaceSchema } from "../domain/air";
import { INDIA_BOUNDS, roundCoordinate } from "../domain/geo";

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 60;

export const PlacesQuerySchema = z.object({
  q: z.string().check(z.trim(), z.minLength(MIN_QUERY_LENGTH), z.maxLength(MAX_QUERY_LENGTH)),
});

export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

export const PlacesReplySchema = z.object({ places: z.array(PlaceSchema).check(z.maxLength(8)) });

export type PlacesReply = z.infer<typeof PlacesReplySchema>;

/** Nearby stations for the map; `enabled` is false when station readings aren't set up. */
export const StationsReplySchema = z.object({
  enabled: z.boolean(),
  stations: z.array(NearbyStationSchema).check(z.maxLength(8)),
});

export type StationsReply = z.infer<typeof StationsReplySchema>;

/** Query strings arrive as text; coordinates are rounded so nearby requests share a cache entry. */
const coordinate = (min: number, max: number) =>
  z.pipe(z.coerce.number().check(z.gte(min), z.lte(max)), z.transform(roundCoordinate));

export const AirQuerySchema = z.object({
  lat: coordinate(INDIA_BOUNDS.minLat, INDIA_BOUNDS.maxLat),
  lon: coordinate(INDIA_BOUNDS.minLon, INDIA_BOUNDS.maxLon),
});
