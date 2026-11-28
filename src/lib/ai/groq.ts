import "server-only";
import * as z from "../zod";
import { AiProviderError, AiResponseError } from "./errors";
import type { Completion, ModelTier } from "./llm";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MAX_COMPLETION_TOKENS = 4096;

/** The parts of a Groq reply this client reads. */
const ReplySchema = z.object({
  choices: z.optional(
    z.array(
      z.object({
        message: z.object({ content: z.nullish(z.string()) }),
        finish_reason: z.nullish(z.string()),
      }),
    ),
  ),
});

const ErrorBodySchema = z.object({ error: z.object({ message: z.string() }) });

/** OpenAI's open-weight GPT-OSS models on Groq: the large one plans, the small one answers. */
const MODEL: Record<ModelTier, string> = {
  smart: "openai/gpt-oss-120b",
  lite: "openai/gpt-oss-20b",
};

const REASONING_EFFORT: Record<ModelTier, "medium" | "low"> = { smart: "medium", lite: "low" };

/**
 * The chat completion Groq is asked for. GPT-OSS models support strict
 * structured output and reason before answering, so the token budget leaves
 * room for both.
 */
function chatRequest(request: Completion) {
  return {
    model: MODEL[request.tier],
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.prompt },
    ],
    temperature: request.temperature,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    reasoning_effort: REASONING_EFFORT[request.tier],
    include_reasoning: false,
    response_format: {
      type: "json_schema",
      json_schema: { name: request.name, schema: request.jsonSchema, strict: true },
    },
  };
}

/** Groq's own explanation of a failed request, trimmed, with the status. */
function providerError(status: number, body: unknown): AiProviderError {
  const parsed = ErrorBodySchema.safeParse(body);
  const detail = parsed.success ? `: ${parsed.data.error.message.slice(0, 200)}` : "";
  return new AiProviderError(`Groq returned ${status}${detail}`, status);
}

/** The reply text, or an error saying why there wasn't any. */
function contentOf(body: unknown): string {
  const choice = ReplySchema.safeParse(body).data?.choices?.[0];
  const content = choice?.message.content;
  if (!content?.trim()) {
    const reason = choice?.finish_reason ?? "unknown";
    throw new AiResponseError(`Groq returned no content (finish_reason: ${reason})`);
  }
  return content;
}

/** Groq's OpenAI-compatible chat endpoint. */
export async function groqComplete(request: Completion, apiKey: string): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(chatRequest(request)),
    signal: request.signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw providerError(response.status, body);
  return contentOf(body);
}
