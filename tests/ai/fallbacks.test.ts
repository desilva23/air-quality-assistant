import { describe, expect, it } from "vitest";
import { AnswerSchema, PlanReplySchema, planItems } from "@/lib/ai/contracts";
import { answerFallback } from "@/lib/ai/fallbacks/ask";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { FAMILY, household, outlookFrom, planRequest, report } from "../support/fixtures";

const clean = report({
  reading: { ...report().reading, pm25: 20, pm10: 40 },
  outlook: outlookFrom(Array(30).fill(25)),
});

describe("built-in plan", () => {
  it("meets the same contract as the AI's plan", () => {
    for (const request of [
      planRequest(),
      planRequest({ report: clean }),
      planRequest({ household: household() }),
    ]) {
      expect(PlanReplySchema.safeParse(planFallback(request)).success).toBe(true);
    }
  });

  it("protects the children, moves the evening play and cites the computed impacts", () => {
    const { plan, facts } = planFallback(planRequest());
    expect(plan.headline).toBe(
      "Very poor air in New Delhi today (AQI 323): extra care for young children",
    );
    expect(plan.routine.evening[0]).toMatchObject({
      action: "Move the children's outdoor play to the cleaner hour below, or do it indoors.",
      impactId: "shift-activity",
    });
    expect(plan.routine.morning[0]?.action).toBe(
      "Keep car windows shut and the AC on recirculate on the way in.",
    );
    expect(plan.routine.evening[1]?.action).toContain("on the way home");
    expect(plan.routine.afternoon[0]?.action).toBe(
      "Fine for errands and time outdoors, keeping effort light for the most sensitive.",
    );
    expect(plan.indoor.map((i) => i.impactId)).toEqual(["purifier", "ventilate", null]);
    expect(plan.alternatives.map((i) => i.impactId)).toEqual([
      "commute-switch",
      "carpool",
      "remote-day",
    ]);
    expect(facts.map((f) => f.id)).toContain("shift-activity");
    expect(plan.shareText.split("\n")).toHaveLength(4);
    expect(plan.shareText).toMatch(
      /^Air in New Delhi today: Very poor, AQI 323\. Source: OpenAQ \(CPCB\)\./,
    );
  });

  it("keeps the activity on a clean day and tells an open-air rider to wear an N95 when it's bad", () => {
    const rider = {
      ...FAMILY,
      members: { ...FAMILY.members, children: false },
      commute: { mode: "two-wheeler" as const, distanceKm: 10, daysPerWeek: 5 },
    };
    const { plan } = planFallback(planRequest({ household: rider }));
    expect(plan.routine.morning[0]).toMatchObject({
      action: "Wear a well-fitted N95 for the ride in.",
      impactId: "mask",
    });
    expect(plan.routine.evening[1]?.action).toBe("Wear a well-fitted N95 for the ride home.");
    expect(plan.headline).not.toContain("extra care");
    expect(plan.routine.afternoon[0]?.action).toBe("Fine for errands and time outdoors.");
    const allDayBad = planFallback(
      planRequest({
        household: household(),
        report: report({ outlook: outlookFrom(Array(30).fill(200)) }),
      }),
    ).plan;
    expect(allDayBad.routine.afternoon[0]?.action).toBe(
      "Keep everyone indoors where you can, with windows shut.",
    );
    const familyBad = planFallback(
      planRequest({ report: report({ outlook: outlookFrom(Array(30).fill(200)) }) }),
    ).plan;
    expect(familyBad.routine.afternoon[0]?.action).toBe(
      "Keep young children indoors where you can, with windows shut.",
    );

    const calm = planFallback(planRequest({ household: rider, report: clean })).plan;
    expect(calm.routine.evening[0]?.action).toBe(
      "Go ahead with the children's outdoor play, at an easy pace.",
    );
    expect(calm.routine.morning[0]?.action).toBe("Fine for errands and time outdoors.");
  });

  it("moves an activity indoors when no cleaner hour exists, and uses the current air without a forecast", () => {
    const flatBad = report({ outlook: outlookFrom(Array(30).fill(200)) });
    const { plan } = planFallback(planRequest({ report: flatBad }));
    expect(plan.routine.evening[0]).toMatchObject({
      action: "Do the children's outdoor play indoors today.",
      impactId: "move-indoors",
    });

    const noForecast = planFallback(planRequest({ report: report({ outlook: [] }) })).plan;
    expect(noForecast.routine.morning[0]?.why).toContain("Air right now is Very poor.");
  });

  it("chooses indoor and travel advice from the home and commute", () => {
    const home = {
      ...FAMILY,
      home: { purifier: true, cooking: "solid" as const, smoker: true },
      commute: { mode: "metro" as const, distanceKm: 12, daysPerWeek: 5 },
    };
    const { plan } = planFallback(
      planRequest({
        household: home,
        report: report({ outlook: outlookFrom(Array(30).fill(150)) }),
      }),
    );
    expect(plan.indoor.map((i) => i.action)).toEqual([
      "Keep the purifier on high in the bedroom, with doors and windows shut.",
      "Cook by an open window or outdoors, and move to LPG if you can.",
      "Smoke only outdoors, well away from doors and windows.",
      "Wet-mop floors and skip incense, mosquito coils and candles.",
    ]);
    expect(plan.alternatives.map((i) => i.action)).toEqual([
      "Ask for a work- or study-from-home day while the smog lasts.",
      "Combine errands into one trip, by metro, bus or e-rickshaw where you can.",
      "Never burn leaves or rubbish, and report open burning on CPCB's Sameer app.",
    ]);
    expect(plan.routine.morning[0]?.action).toContain("Keep car windows shut");
  });

  it("never gives a remote-day nudge on a clean day", () => {
    const { plan } = planFallback(planRequest({ report: clean }));
    expect(planItems(plan).some((i) => i.impactId === "remote-day")).toBe(false);
  });
});

describe("built-in answer", () => {
  it("says plainly it's general guidance, with today's air and tips", () => {
    const answer = answerFallback({ ...planRequest(), question: "Can we go to the park?" });
    expect(AnswerSchema.safeParse(answer).success).toBe(true);
    expect(answer.answer).toMatch(/^I can't answer that question in detail right now/);
    expect(answer.answer).toContain("The air in New Delhi is Very poor (AQI 323).");
    expect(answer.answer).toContain("Take extra care for young children.");
    expect(answer.tips).toHaveLength(3);
    const calm = answerFallback({ ...planRequest({ household: household() }), question: "Ok?" });
    expect(calm.answer).not.toContain("extra care");
  });
});
