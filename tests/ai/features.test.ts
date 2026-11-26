import { describe, expect, it, vi } from "vitest";
import { answerQuestion, createPlan } from "@/lib/ai/features";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { generateStructured } from "@/lib/ai/llm";
import { planRequest } from "../support/fixtures";

vi.mock("@/lib/ai/llm", () => ({ generateStructured: vi.fn() }));

describe("AI features", () => {
  it("writes the plan with the smart model and returns it with the computed facts", async () => {
    const reply = planFallback(planRequest());
    vi.mocked(generateStructured).mockResolvedValue(reply.plan);
    await expect(createPlan(planRequest())).resolves.toEqual(reply);
    const call = vi.mocked(generateStructured).mock.calls[0]?.[0];
    expect(call).toMatchObject({ name: "household_plan", model: "smart" });
    expect(call?.prompt).toContain("Impact facts, written in the reply language (cite by id):");
  });

  it("answers questions with the lite model", async () => {
    vi.mocked(generateStructured).mockResolvedValue({ answer: "Not this evening.", tips: [] });
    await expect(answerQuestion({ ...planRequest(), question: "Park at 6?" })).resolves.toEqual({
      answer: "Not this evening.",
      tips: [],
    });
    expect(vi.mocked(generateStructured).mock.calls[0]?.[0]).toMatchObject({
      name: "answer",
      model: "lite",
    });
  });
});
