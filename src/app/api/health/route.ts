import { groqKey, openAqKey } from "@/lib/server/config";

/** Liveness, and which optional services this server has switched on. No secrets. */
export function GET(): Response {
  return Response.json(
    { ok: true, ai: groqKey() ? "groq" : null, stations: openAqKey() !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
