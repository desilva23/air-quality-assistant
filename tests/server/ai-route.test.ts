import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiProviderError, AiUnavailableError } from "@/lib/ai/errors";
import { aiRoute } from "@/lib/server/ai-route";
import * as z from "@/lib/zod";
import { rejection } from "../support/fetch";

const Input = z.object({ question: z.string().check(z.minLength(1)) });
const Output = z.object({ answer: z.string() });

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1", ...headers },
    body,
  });
}

function route(run: (input: { question: string }) => Promise<{ answer: string }>) {
  return aiRoute({
    name: "ask",
    input: Input,
    output: Output,
    run,
    fallback: ({ question }) => ({ answer: `Built-in answer to ${question}` }),
  });
}

describe("aiRoute", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("validates, calls the model and caches identical requests", async () => {
    const run = vi.fn(async ({ question }: { question: string }) => ({
      answer: `AI: ${question}`,
    }));
    const POST = route(run);
    const first = await POST(post('{"question":"Park?"}'));
    expect(await first.json()).toEqual({ source: "ai", data: { answer: "AI: Park?" } });
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    const second = await POST(post('{"question":"Park?"}'));
    expect(second.headers.get("X-Cache")).toBe("HIT");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses the wrong content type, oversized and invalid bodies with codes only", async () => {
    const POST = route(async () => ({ answer: "x" }));
    const wrongType = await POST(post("question=hi", { "content-type": "text/plain" }));
    expect(wrongType.status).toBe(415);
    const missingType = new Request("http://localhost/api/ask", {
      method: "POST",
      body: new Uint8Array(2),
    });
    expect((await POST(missingType)).status).toBe(415);
    expect((await POST(post(`{"question":"${"x".repeat(40_000)}"}`))).status).toBe(413);
    const notJson = await POST(post("{oops"));
    expect(notJson.status).toBe(400);
    expect(await notJson.json()).toEqual({ error: "INVALID_INPUT" });
    expect((await POST(post('{"question":""}'))).status).toBe(400);
  });

  it("refuses other sites and too many requests before reading the body", async () => {
    const POST = route(async () => ({ answer: "x" }));
    expect(
      (await POST(post("{}", { origin: "https://evil.example", host: "localhost" }))).status,
    ).toBe(403);
    const responses = await Promise.all(
      Array.from({ length: 11 }, () =>
        POST(post('{"question":"a"}', { "x-forwarded-for": "7.7.7.7" })),
      ),
    );
    expect(responses.map((r) => r.status)).toContain(429);
  });

  it("falls back to the built-in answer and logs only safe details", async () => {
    const unavailable = await route(() => Promise.reject(new AiUnavailableError("no key")))(
      post('{"question":"a"}'),
    );
    expect(await unavailable.json()).toEqual({
      source: "fallback",
      data: { answer: "Built-in answer to a" },
      notice: "ai-off",
    });
    expect(console.error).not.toHaveBeenCalled();

    const quota = await route(() => Promise.reject(new AiProviderError("Groq returned 429", 429)))(
      post('{"question":"b"}'),
    );
    expect((await quota.json()).notice).toBe("ai-failed");
    expect(console.error).toHaveBeenCalledWith("[ai:ask] Groq returned 429");

    await route(() => Promise.reject(new TypeError("user text here")))(post('{"question":"c"}'));
    expect(console.error).toHaveBeenCalledWith("[ai:ask] TypeError");
    await route(() => rejection())(post('{"question":"d"}'));
    expect(console.error).toHaveBeenCalledWith("[ai:ask] UnknownError");
  });
});
