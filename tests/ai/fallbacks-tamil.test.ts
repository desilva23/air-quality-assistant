import { describe, expect, it } from "vitest";
import { AnswerSchema, PlanReplySchema, planItems } from "@/lib/ai/contracts";
import { answerFallback } from "@/lib/ai/fallbacks/ask";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { FAMILY, household, outlookFrom, planRequest, report } from "../support/fixtures";

const TAMIL = /[஀-௿]/;
const ta = { language: "ta" as const };
const clean = report({
  reading: { ...report().reading, pm25: 20, pm10: 40 },
  outlook: outlookFrom(Array(30).fill(25)),
});
const allDayBad = report({ outlook: outlookFrom(Array(30).fill(200)) });

describe("built-in plan in Tamil", () => {
  it("meets the same contract and is written in Tamil throughout", () => {
    const reply = planFallback(planRequest(ta));
    expect(PlanReplySchema.safeParse(reply).success).toBe(true);
    for (const item of planItems(reply.plan)) {
      expect(item.action).toMatch(TAMIL);
      expect(item.why).toMatch(TAMIL);
    }
    expect(reply.plan.headline).toBe(
      "இன்று New Delhi காற்று: மிகவும் மோசம் (AQI 323); இளம் குழந்தைகள் மீது கூடுதல் கவனம்",
    );
    expect(reply.plan.shareText).toMatch(
      /^இன்று New Delhi காற்று: மிகவும் மோசம், AQI 323\. மூலம்: OpenAQ \(CPCB\)\./,
    );
    expect(reply.plan.routine.evening[0]?.action).toContain("கீழே உள்ள தூய்மையான நேரத்துக்கு மாற்றுங்கள்");
    expect(reply.plan.routine.morning[0]?.action).toContain("போகும் வழியில்");
    expect(reply.plan.routine.evening[1]?.action).toContain("திரும்பும் வழியில்");
    expect(reply.facts[0]?.text).toMatch(TAMIL);
  });

  it("covers riders, clean days, indoor-only days and missing forecasts", () => {
    const rider = {
      ...FAMILY,
      members: { ...FAMILY.members, children: false },
      commute: { mode: "two-wheeler" as const, distanceKm: 10, daysPerWeek: 5 },
    };
    const riding = planFallback(planRequest({ ...ta, household: rider })).plan;
    expect(riding.routine.morning[0]?.action).toContain("வேலைக்குச் செல்லும்");
    expect(riding.routine.evening[1]?.action).toContain("வீடு திரும்பும்");
    expect(riding.headline).not.toContain("கவனம்");

    const calm = planFallback(planRequest({ ...ta, household: rider, report: clean })).plan;
    expect(calm.routine.evening[0]?.action).toContain("தொடரலாம்");
    expect(calm.routine.morning[0]?.action).toBe("வேலைகளுக்கும் வெளியே நேரம் செலவிடவும் பரவாயில்லை.");
    const calmFamily = planFallback(planRequest({ ...ta, report: clean })).plan;
    expect(calmFamily.routine.morning[0]?.action).toContain("உணர்திறன் மிக்கவர்களுக்கு");

    const indoors = planFallback(planRequest({ ...ta, report: allDayBad })).plan;
    expect(indoors.routine.evening[0]?.action).toContain("இன்று வீட்டுக்குள் செய்யுங்கள்");
    expect(indoors.routine.afternoon[0]?.action).toContain("இளம் குழந்தைகள்");
    const everyone = planFallback(
      planRequest({ ...ta, household: household(), report: allDayBad }),
    ).plan;
    expect(everyone.routine.afternoon[0]?.action).toContain("அனைவரும்");

    const blind = planFallback(planRequest({ ...ta, report: report({ outlook: [] }) })).plan;
    expect(blind.routine.morning[0]?.why).toContain("இப்போது காற்று: மிகவும் மோசம்.");
  });
});

describe("built-in answer in Tamil", () => {
  it("says plainly it's general guidance, in Tamil, with today's air", () => {
    const answer = answerFallback({ ...planRequest(ta), question: "பூங்காவுக்குப் போகலாமா?" });
    expect(AnswerSchema.safeParse(answer).success).toBe(true);
    expect(answer.answer).toMatch(/^இப்போது அந்தக் கேள்விக்கு விரிவாகப் பதிலளிக்க முடியவில்லை/);
    expect(answer.answer).toContain("இளம் குழந்தைகள் மீது கூடுதல் கவனம் செலுத்துங்கள்.");
    expect(answer.tips.every((tip) => TAMIL.test(tip))).toBe(true);
  });
});
