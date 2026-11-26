import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiResponseError, AiUnavailableError } from "@/lib/ai/errors";
import { groqComplete } from "@/lib/ai/groq";
import { generateStructured } from "@/lib/ai/llm";
import * as z from "@/lib/zod";

vi.mock("@/lib/ai/groq", () => ({ groqComplete: vi.fn() }));

const request = {
  name: "answer",
  schema: z.object({ answer: z.string().check(z.maxLength(8)) }),
  system: "rules",
  prompt: "question",
  model: "lite" as const,
  temperature: 0.2,
  timeoutMs: 1000,
};

describe("generateStructured", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "key");
  });

  it("refuses to run without a key", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    await expect(generateStructured(request)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(groqComplete).not.toHaveBeenCalled();
  });

  it("sends the portable schema and returns the trimmed, validated reply", async () => {
    vi.mocked(groqComplete).mockResolvedValue('{"answer":"Stay indoors today"}');
    await expect(generateStructured(request)).resolves.toEqual({ answer: "Stay in…" });
    const [completion, key] = vi.mocked(groqComplete).mock.calls[0] ?? [];
    expect(key).toBe("key");
    expect(completion).toMatchObject({ name: "answer", tier: "lite", temperature: 0.2 });
    expect(JSON.stringify(completion?.jsonSchema)).not.toContain("maxLength");
  });

  it("retries a malformed reply once, then gives up", async () => {
    vi.mocked(groqComplete)
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce('{"answer":"Yes"}');
    await expect(generateStructured(request)).resolves.toEqual({ answer: "Yes" });

    vi.mocked(groqComplete).mockReset().mockResolvedValue('{"wrong":1}');
    await expect(generateStructured(request)).rejects.toBeInstanceOf(AiResponseError);
    expect(groqComplete).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry a provider failure", async () => {
    vi.mocked(groqComplete).mockReset().mockRejectedValue(new Error("quota"));
    await expect(generateStructured(request)).rejects.toThrow("quota");
    expect(groqComplete).toHaveBeenCalledTimes(1);
  });
});
