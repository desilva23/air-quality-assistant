import "server-only";
import type * as z from "../zod";
import { groqKey } from "../server/config";
import { AiResponseError, AiUnavailableError } from "./errors";
import { groqComplete } from "./groq";
import { fitToSchema, responseSchemas } from "./json-schema";

/** "smart" for open-ended generation, "lite" for short, fast answers. */
export type ModelTier = "smart" | "lite";

export interface Completion {
  /** Identifier for the schema, sent with it. */
  name: string;
  system: string;
  prompt: string;
  jsonSchema: object;
  tier: ModelTier;
  temperature: number;
  signal: AbortSignal;
}

export interface StructuredRequest<S extends z.ZodMiniType> {
  name: string;
  schema: S;
  system: string;
  prompt: string;
  model: ModelTier;
  temperature: number;
  timeoutMs: number;
}

/**
 * Asks Groq for JSON matching `schema`, then trims and validates the reply. A
 * malformed reply gets one retry; provider failures and timeouts don't, so a
 * slow upstream can't stack up latency.
 */
export async function generateStructured<S extends z.ZodMiniType>(
  request: StructuredRequest<S>,
): Promise<z.infer<S>> {
  const apiKey = groqKey();
  if (!apiKey) throw new AiUnavailableError("GROQ_API_KEY is not set");
  const { portable, full } = responseSchemas(request.schema);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await groqComplete(
      {
        name: request.name,
        system: request.system,
        prompt: request.prompt,
        jsonSchema: portable,
        tier: request.model,
        temperature: request.temperature,
        signal: AbortSignal.timeout(request.timeoutMs),
      },
      apiKey,
    );
    try {
      return request.schema.parse(fitToSchema(JSON.parse(text), full));
    } catch (error) {
      lastError = error;
    }
  }
  throw new AiResponseError("Model output did not match the expected shape", { cause: lastError });
}
