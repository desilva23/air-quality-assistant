import { describe, expect, it } from "vitest";
import { AiProviderError, AiResponseError } from "@/lib/ai/errors";
import { groqComplete } from "@/lib/ai/groq";
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

  it("answers questions with the small model and low reasoning", async () => {
    const fetch = stubFetch(() => reply("{}"));
    await groqComplete({ ...completion, tier: "lite" }, "key");
    expect(bodyOf(fetch.mock.calls[0]?.[1])).toMatchObject({
      model: "openai/gpt-oss-20b",
      reasoning_effort: "low",
      response_format: { json_schema: { strict: true } },
    });
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
