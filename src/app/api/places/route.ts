import { searchPlaces } from "@/lib/air/open-meteo";
import { PlacesQuerySchema, PlacesReplySchema } from "@/lib/air/contracts";
import { dataRoute } from "@/lib/server/data-route";

export const GET = dataRoute({
  name: "places",
  query: PlacesQuerySchema,
  output: PlacesReplySchema,
  run: async ({ q }) => ({ places: await searchPlaces(q) }),
  // Place names don't move.
  ttlMs: 24 * 60 * 60_000,
});
