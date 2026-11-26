import "server-only";
import { createHash } from "node:crypto";
import type { z } from "zod";
import { errorResponse } from "../api-errors";
import { jsonResponse, NO_STORE, refusal } from "./request";
import { createStores } from "./stores";

/** Lookups are cheap but hit outside services, so each client gets thirty a minute per route. */
const DATA_REQUESTS_PER_MINUTE = 30;

export interface DataRouteOptions<I, O> {
  name: string;
  /** Validates the query string, as an object of its parameters. */
  query: z.ZodType<I>;
  /** The reply's shape, used to check answers read back from the shared cache. */
  output: z.ZodType<O>;
  run: (input: I) => Promise<O>;
  /** How long an answer is reused for the same query. */
  ttlMs: number;
}

/**
 * Builds a GET handler for live data: same-origin check, rate limit, query
 * validation and a shared cache, so a busy city costs one upstream call per
 * cache period rather than one per visitor.
 */
export function dataRoute<I, O>({ name, query, output, run, ttlMs }: DataRouteOptions<I, O>) {
  const { limiter, cache } = createStores<O>({
    name,
    limit: DATA_REQUESTS_PER_MINUTE,
    windowMs: 60_000,
    ttlMs,
    maxEntries: 500,
    schema: output,
  });

  return async function GET(request: Request): Promise<Response> {
    const refused = await refusal(request, limiter);
    if (refused) return refused;
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = query.safeParse(params);
    if (!parsed.success) return errorResponse("INVALID_INPUT", NO_STORE);

    const key = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
    const cached = await cache.get(key);
    if (cached) return jsonResponse(cached, { cached: true });
    try {
      const data = await run(parsed.data);
      await cache.set(key, data);
      return jsonResponse(data);
    } catch (error) {
      console.error(`[data:${name}] ${error instanceof Error ? error.message : "UnknownError"}`);
      return errorResponse("DATA_UNAVAILABLE", NO_STORE);
    }
  };
}
