import { AirQuerySchema } from "@/lib/air/contracts";
import { airReport } from "@/lib/air/report";
import { AirReportSchema } from "@/lib/domain/air";
import { dataRoute } from "@/lib/server/data-route";

export const GET = dataRoute({
  name: "air",
  query: AirQuerySchema,
  output: AirReportSchema,
  run: ({ lat, lon }) => airReport({ latitude: lat, longitude: lon }),
  // Stations report hourly at best; ten minutes keeps readings current.
  ttlMs: 10 * 60_000,
});
