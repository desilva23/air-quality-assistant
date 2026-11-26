// Query and reply shapes for the air-data endpoints, shared by the server
// routes and the browser client.

import { z } from "../zod";
import { NearbyStationSchema, PlaceSchema } from "../domain/air";
import { INDIA_BOUNDS, roundCoordinate } from "../domain/geo";

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 60;

export const PlacesQuerySchema = z.object({
  q: z.string().trim().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH),
});

export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

export const PlacesReplySchema = z.object({ places: z.array(PlaceSchema).max(8) });

export type PlacesReply = z.infer<typeof PlacesReplySchema>;

/** Nearby stations for the map; `enabled` is false when station readings aren't set up. */
export const StationsReplySchema = z.object({
  enabled: z.boolean(),
  stations: z.array(NearbyStationSchema).max(8),
});

export type StationsReply = z.infer<typeof StationsReplySchema>;

/** Query strings arrive as text; coordinates are rounded so nearby requests share a cache entry. */
export const AirQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(INDIA_BOUNDS.minLat)
    .max(INDIA_BOUNDS.maxLat)
    .transform(roundCoordinate),
  lon: z.coerce
    .number()
    .min(INDIA_BOUNDS.minLon)
    .max(INDIA_BOUNDS.maxLon)
    .transform(roundCoordinate),
});
