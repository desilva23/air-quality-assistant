import { describe, expect, it, vi } from "vitest";
import { AiProviderError, AiResponseError } from "@/lib/ai/errors";
import { groqComplete, modelFor } from "@/lib/ai/groq";
import type { Completion } from "@/lib/ai/llm";
import { bodyOf, json, stubFetch } from "../support/fetch";

const completion: Completion = {
  name: "plan",
  system: "rules",
  prompt: "facts",
  jsonSchema: { type: "object" },
  tier: "smart",
  temperature: 0.4,
  signal: new AbortController().signal,
};

const reply = (content: unknown, finish = "stop") =>
  json({ choices: [{ message: { content }, finish_reason: finish }] });

describe("Groq client", () => {
  it("picks GPT-OSS models by tier, unless overridden", () => {
    expect(modelFor("smart")).toBe("openai/gpt-oss-120b");
    expect(modelFor("lite")).toBe("openai/gpt-oss-20b");
    // A blank override means the default, not an empty model name.
    vi.stubEnv("GROQ_MODEL", "  ");
    expect(modelFor("smart")).toBe("openai/gpt-oss-120b");
    vi.stubEnv("GROQ_LITE_MODEL", "llama-3.1-8b-instant");
    expect(modelFor("lite")).toBe("llama-3.1-8b-instant");
  });

  it("asks for strict structured output with reasoning tuned to the tier", async () => {
    const fetch = stubFetch(() => reply('{"ok":true}'));
    await expect(groqComplete(completion, "key")).resolves.toBe('{"ok":true}');
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer key" });
    const body = bodyOf(init);
    expect(body).toMatchObject({
      model: "openai/gpt-oss-120b",
      reasoning_effort: "medium",
      include_reasoning: false,
      response_format: { type: "json_schema", json_schema: { name: "plan", strict: true } },
    });
    expect(body).toMatchObject({
      messages: [
        { role: "system", content: "rules" },
        { role: "user", content: "facts" },
      ],
    });
  });

  it("uses low reasoning for the lite tier and plain JSON schema for other models", async () => {
    const fetch = stubFetch(() => reply("{}"));
    await groqComplete({ ...completion, tier: "lite" }, "key");
    expect(bodyOf(fetch.mock.calls[0]?.[1])).toMatchObject({ reasoning_effort: "low" });
    vi.stubEnv("GROQ_MODEL", "llama-3.3-70b-versatile");
    await groqComplete(completion, "key");
    const body = bodyOf(fetch.mock.calls[1]?.[1]);
    expect(body).not.toHaveProperty("reasoning_effort");
    expect(body).toMatchObject({ response_format: { json_schema: { strict: false } } });
  });

  it("turns a refusal into a provider error with Groq's own message, trimmed", async () => {
    stubFetch(() => json({ error: { message: "Rate limit reached ".repeat(20) } }, 429));
    const error = await groqComplete(completion, "key").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({ status: 429 });
    expect((error as Error).message.length).toBeLessThan(230);
    stubFetch(() => new Response("bad gateway", { status: 502 }));
    await expect(groqComplete(completion, "key")).rejects.toThrow("Groq returned 502");
  });

  it("reports an empty reply with its finish reason", async () => {
    stubFetch(() => reply("  ", "length"));
    await expect(groqComplete(completion, "key")).rejects.toThrow("finish_reason: length");
    stubFetch(() => json({}));
    await expect(groqComplete(completion, "key")).rejects.toBeInstanceOf(AiResponseError);
  });
});
