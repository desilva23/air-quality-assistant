import "server-only";
import { createHash } from "node:crypto";
import type * as z from "../zod";
import { errorResponse } from "../api-errors";
import { envelopeOf, type AiEnvelope, type FallbackNotice } from "../ai/contracts";
import { AiProviderError, AiUnavailableError } from "../ai/errors";
import { jsonResponse, NO_STORE, readLimitedBody, refusal } from "./request";
import { createStores } from "./stores";

const MAX_BODY_BYTES = 32_000;
/** Model calls spend quota, so each client gets ten a minute on each AI route. */
const AI_REQUESTS_PER_MINUTE = 10;
const CACHE_MINUTES = 10;

export interface AiRouteOptions<I, O> {
  name: string;
  input: z.ZodMiniType<I>;
  /** The reply's shape, used to check answers read back from the shared cache. */
  output: z.ZodMiniType<O>;
  run: (input: I) => Promise<O>;
  /** The deterministic answer when the model is unconfigured or fails. */
  fallback: (input: I) => O;
}

/** The body as validated input, or the refusal to send. */
async function readInput<I>(request: Request, schema: z.ZodMiniType<I>): Promise<I | Response> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/json"))
    return errorResponse("UNSUPPORTED_MEDIA_TYPE", NO_STORE);
  const raw = await readLimitedBody(request, MAX_BODY_BYTES);
  if (raw === null) return errorResponse("TOO_LARGE", NO_STORE);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse("INVALID_INPUT", NO_STORE);
  }
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : errorResponse("INVALID_INPUT", NO_STORE);
}

/**
 * Logs why the model call failed. Provider errors carry the provider's own
 * message (status, quota, schema problems), never the user's text, so they are
 * safe to log in full; anything else is logged by name only.
 */
function logFailure(name: string, error: unknown): void {
  if (error instanceof AiUnavailableError) return;
  if (error instanceof AiProviderError) console.error(`[ai:${name}] ${error.message}`);
  else console.error(`[ai:${name}] ${error instanceof Error ? error.name : "UnknownError"}`);
}

/** A code, not words: the browser says it in the reader's language. */
function fallbackNotice(error: unknown): FallbackNotice {
  return error instanceof AiUnavailableError ? "ai-off" : "ai-failed";
}

/**
 * Builds a POST handler for an AI feature: same-origin check, rate limit,
 * content type, size cap, schema validation, shared response cache, then the
 * model call with a deterministic fallback. User content is never logged.
 */
export function aiRoute<I, O>({ name, input, output, run, fallback }: AiRouteOptions<I, O>) {
  const { limiter, cache } = createStores<AiEnvelope<O>>({
    name: `ai-${name}`,
    limit: AI_REQUESTS_PER_MINUTE,
    windowMs: 60_000,
    ttlMs: CACHE_MINUTES * 60_000,
    maxEntries: 200,
    schema: envelopeOf(output),
  });

  return async function POST(request: Request): Promise<Response> {
    const refused = await refusal(request, limiter);
    if (refused) return refused;
    const data = await readInput(request, input);
    if (data instanceof Response) return data;

    const key = createHash("sha256").update(JSON.stringify(data)).digest("hex");
    const cached = await cache.get(key);
    if (cached) return jsonResponse(cached, { cached: true });
    try {
      const envelope: AiEnvelope<O> = { source: "ai", data: await run(data) };
      await cache.set(key, envelope);
      return jsonResponse(envelope);
    } catch (error) {
      logFailure(name, error);
      return jsonResponse({
        source: "fallback",
        data: fallback(data),
        notice: fallbackNotice(error),
      });
    }
  };
}
