import "server-only";
import { createHash } from "node:crypto";
import type { z } from "zod";
import { errorResponse } from "../api-errors";
import { envelopeOf, type AiEnvelope } from "../ai/contracts";
import { AiProviderError, AiUnavailableError } from "../ai/errors";
import { jsonResponse, NO_STORE, readLimitedBody, refusal } from "./request";
import { createStores } from "./stores";

const MAX_BODY_BYTES = 32_000;

export interface AiRouteOptions<I, O> {
  name: string;
  input: z.ZodType<I>;
  /** The reply's shape, used to check answers read back from the shared cache. */
  output: z.ZodType<O>;
  run: (input: I) => Promise<O>;
  /** The deterministic answer when the model is unconfigured or fails. */
  fallback: (input: I) => O;
}

/** The body as validated input, or the refusal to send. */
async function readInput<I>(request: Request, schema: z.ZodType<I>): Promise<I | Response> {
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

function fallbackNotice(error: unknown): string {
  return error instanceof AiUnavailableError
    ? "AI isn't switched on for this server, so this is the built-in guidance."
    : "The AI service didn't answer, so this is the built-in guidance.";
}

/**
 * Builds a POST handler for an AI feature: same-origin check, rate limit,
 * content type, size cap, schema validation, shared response cache, then the
 * model call with a deterministic fallback. User content is never logged.
 */
export function aiRoute<I, O>({ name, input, output, run, fallback }: AiRouteOptions<I, O>) {
  const { limiter, cache } = createStores<AiEnvelope<O>>({
    name: `ai-${name}`,
    limit: 10,
    windowMs: 60_000,
    ttlMs: 10 * 60_000,
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
