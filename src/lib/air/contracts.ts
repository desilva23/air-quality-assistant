// Query and reply shapes for the air-data endpoints, shared by the server
// routes and the browser client.

import { z } from "../zod";
import { PlaceSchema } from "../domain/air";
import { INDIA_BOUNDS, roundCoordinate } from "../domain/geo";

export const PlacesQuerySchema = z.object({ q: z.string().trim().min(2).max(60) });

export type PlacesQuery = z.infer<typeof PlacesQuerySchema>;

export const PlacesReplySchema = z.object({ places: z.array(PlaceSchema).max(8) });

export type PlacesReply = z.infer<typeof PlacesReplySchema>;

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
