import { describe, expect, it } from "vitest";
import {
  AnswerEnvelopeSchema,
  AskRequestSchema,
  citeOnce,
  PlanEnvelopeSchema,
  PlanReplySchema,
  PlanRequestSchema,
  planItems,
  planSchemaCiting,
} from "@/lib/ai/contracts";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { planRequest } from "../support/fixtures";

const reply = planFallback(planRequest());

describe("citeOnce", () => {
  it("keeps the first citation of each impact and clears repeats, in reading order", () => {
    const item = (impactId: "purifier" | null) => ({ action: "a", why: "b", impactId });
    const plan = {
      ...reply.plan,
      routine: {
        morning: [item("purifier")],
        afternoon: [item(null)],
        evening: [item("purifier")],
      },
      indoor: [item("purifier")],
      alternatives: [item(null)],
    };
    expect(planItems(citeOnce(plan)).map((i) => i.impactId)).toEqual([
      "purifier",
      null,
      null,
      null,
      null,
    ]);
  });
});

describe("AI contracts", () => {
  it("accepts a well-formed plan request and question", () => {
    expect(PlanRequestSchema.safeParse(planRequest()).success).toBe(true);
    expect(PlanRequestSchema.safeParse(planRequest({ language: "ta" })).success).toBe(true);
    expect(PlanRequestSchema.safeParse({ ...planRequest(), language: undefined }).success).toBe(
      false,
    );
    expect(
      AskRequestSchema.safeParse({ ...planRequest(), question: "Can we go out?" }).success,
    ).toBe(true);
    expect(
      AskRequestSchema.safeParse({ ...planRequest(), question: "x".repeat(301) }).success,
    ).toBe(false);
  });

  it("lets the model cite only the impacts computed for this request", () => {
    const uncited = (items: typeof reply.plan.indoor) =>
      items.map((i) => ({ ...i, impactId: null }));
    const { routine } = reply.plan;
    const bare = {
      ...reply.plan,
      routine: {
        morning: uncited(routine.morning),
        afternoon: uncited(routine.afternoon),
        evening: uncited(routine.evening),
      },
      indoor: uncited(reply.plan.indoor),
      alternatives: uncited(reply.plan.alternatives),
    };
    const citing = { ...bare, indoor: [{ action: "Do it", why: "Because", impactId: "carpool" }] };
    expect(planSchemaCiting([]).safeParse(bare).success).toBe(true);
    expect(planSchemaCiting(["carpool"]).safeParse(citing).success).toBe(true);
    expect(planSchemaCiting(["mask"]).safeParse(citing).success).toBe(false);
    expect(planSchemaCiting([]).safeParse(citing).success).toBe(false);
  });

  it("rejects a reply that cites a fact it doesn't include", () => {
    expect(PlanReplySchema.safeParse(reply).success).toBe(true);
    expect(PlanReplySchema.safeParse({ ...reply, facts: [] }).success).toBe(false);
  });

  it("wraps replies in an envelope that says where they came from", () => {
    expect(
      PlanEnvelopeSchema.safeParse({ source: "fallback", data: reply, notice: "ai-off" }).success,
    ).toBe(true);
    expect(
      AnswerEnvelopeSchema.safeParse({ source: "ai", data: { answer: "Yes", tips: [] } }).success,
    ).toBe(true);
    expect(
      AnswerEnvelopeSchema.safeParse({ source: "model", data: { answer: "Yes", tips: [] } })
        .success,
    ).toBe(false);
  });

  it("lists every item in a plan, in reading order", () => {
    const { routine, indoor, alternatives } = reply.plan;
    expect(planItems(reply.plan)).toEqual([
      ...routine.morning,
      ...routine.afternoon,
      ...routine.evening,
      ...indoor,
      ...alternatives,
    ]);
  });
});
