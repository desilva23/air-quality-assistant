import { AirQuerySchema, StationsReplySchema } from "@/lib/air/contracts";
import { stationsNear } from "@/lib/air/report";
import { dataRoute } from "@/lib/server/data-route";

export const GET = dataRoute({
  name: "stations",
  query: AirQuerySchema,
  output: StationsReplySchema,
  run: ({ lat, lon }) => stationsNear({ latitude: lat, longitude: lon }),
  // Up to nine OpenAQ calls per answer, so it is shared for ten minutes.
  ttlMs: 10 * 60_000,
});
