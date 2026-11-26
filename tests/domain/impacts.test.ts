import { describe, expect, it } from "vitest";
import { impactFacts, outdoorMinutes, type ImpactId } from "@/lib/domain/impacts";
import { assessSituation } from "@/lib/domain/situation";
import { FAMILY, household, outlookFrom, report } from "../support/fixtures";

const textOf = (facts: { id: ImpactId; text: string }[], id: ImpactId) =>
  facts.find((fact) => fact.id === id)?.text;

describe("impact facts for the Delhi family", () => {
  const facts = impactFacts(FAMILY, report());

  it("computes every impact that applies, with its numbers", () => {
    expect(facts.map((fact) => fact.id)).toEqual([
      "shift-activity",
      "move-indoors",
      "mask",
      "purifier",
      "ventilate",
      "commute-switch",
      "carpool",
      "remote-day",
    ]);
    expect(textOf(facts, "shift-activity")).toBe(
      "Moving your 60-minute children's outdoor play from 6:00 pm to 2:00 pm cuts the PM2.5 you breathe during it by about 67% (forecast 70 vs 210 µg/m³).",
    );
    expect(textOf(facts, "move-indoors")).toContain("about 30%, and more with a purifier");
    expect(textOf(facts, "mask")).toContain(
      "instead of no mask cuts what you breathe in during your 60 minutes outdoors by about 75%",
    );
    expect(textOf(facts, "purifier")).toContain("near 45 instead of about 105 µg/m³");
    expect(textOf(facts, "ventilate")).toContain(
      "around 2:00 pm, the cleanest hour forecast (70 µg/m³, against a peak of 250 at 7:00 am)",
    );
    expect(textOf(facts, "commute-switch")).toBe(
      "Taking the metro or a bus instead of your car for 15 km each way saves about 19 kg of CO₂ and ₹880 of petrol a week.",
    );
    expect(textOf(facts, "carpool")).toBe(
      "Sharing the car with two others cuts your share of its CO₂ by about 14 kg a week, and your petrol bill by about ₹590 if you split the cost.",
    );
    expect(textOf(facts, "remote-day")).toBe(
      "One day a week at home instead of commuting saves 82 minutes on the road, about 4.2 kg of CO₂ and ₹180 of petrol.",
    );
  });
});

describe("impact facts that don't apply", () => {
  it("drops activity impacts when there is no outdoor activity", () => {
    const ids = impactFacts(
      household({ activity: { kind: "none", partOfDay: "morning", minutes: 0 } }),
      report(),
    ).map((f) => f.id);
    expect(ids).not.toContain("shift-activity");
    expect(ids).not.toContain("move-indoors");
    expect(ids).not.toContain("mask");
  });

  it("skips a time shift of under 10% and one with no forecast", () => {
    const flat = report({ outlook: outlookFrom(Array(30).fill(100)) });
    expect(textOf(impactFacts(FAMILY, flat), "shift-activity")).toBeUndefined();
    expect(textOf(impactFacts(FAMILY, flat), "ventilate")).toBeUndefined();
    const none = report({ outlook: [] });
    expect(textOf(impactFacts(FAMILY, none), "shift-activity")).toBeUndefined();
    const zeroMinutes = { ...FAMILY, activity: { ...FAMILY.activity, minutes: 0 } };
    expect(textOf(impactFacts(zeroMinutes, report()), "shift-activity")).toBeUndefined();
  });

  it("credits a purifier the household already has, and skips mask advice for N95 wearers", () => {
    const equipped = { ...FAMILY, home: { ...FAMILY.home, purifier: true }, mask: "n95" as const };
    const facts = impactFacts(equipped, report());
    expect(textOf(facts, "move-indoors")).toContain("about 70% with your purifier running");
    expect(textOf(facts, "purifier")).toBeUndefined();
    expect(textOf(facts, "mask")).toBeUndefined();
  });

  it("gives commute impacts only to people who drive or ride, and the CO₂ only when there is some", () => {
    const bus = { ...FAMILY, commute: { mode: "bus" as const, distanceKm: 10, daysPerWeek: 5 } };
    const busFacts = impactFacts(bus, report());
    expect(textOf(busFacts, "commute-switch")).toBeUndefined();
    expect(textOf(busFacts, "carpool")).toBeUndefined();
    const walk = { ...FAMILY, commute: { mode: "walk" as const, distanceKm: 2, daysPerWeek: 5 } };
    expect(textOf(impactFacts(walk, report()), "remote-day")).toBe(
      "One day a week at home instead of commuting saves 48 minutes on the road.",
    );
    const auto = { ...FAMILY, commute: { mode: "auto" as const, distanceKm: 8, daysPerWeek: 5 } };
    expect(textOf(impactFacts(auto, report()), "commute-switch")).toBe(
      "Taking the metro or a bus instead of your auto-rickshaw for 8 km each way saves about 7.4 kg of CO₂ a week.",
    );
    const idleCar = {
      ...FAMILY,
      commute: { mode: "car" as const, distanceKm: 15, daysPerWeek: 0 },
    };
    const idleIds = impactFacts(idleCar, report()).map((f) => f.id);
    expect(idleIds).not.toContain("commute-switch");
    expect(idleIds).not.toContain("carpool");
    expect(idleIds).not.toContain("remote-day");
  });

  it("counts open-air commuting as time outdoors", () => {
    const rider = household({ commute: { mode: "two-wheeler", distanceKm: 11, daysPerWeek: 5 } });
    expect(outdoorMinutes(rider)).toBe(60 + 30);
    expect(outdoorMinutes(FAMILY)).toBe(60);
  });
});

describe("situation", () => {
  it("brings together today's index, the day's forecast, who needs care and the impacts", () => {
    const situation = assessSituation(FAMILY, report());
    expect(situation.aqi).toEqual({ value: 323, category: "very-poor", dominant: "pm25" });
    expect(situation.parts).toEqual({
      morning: { average: 198, category: "very-poor" },
      afternoon: { average: 84, category: "moderate" },
      evening: { average: 200, category: "very-poor" },
    });
    expect(situation.sensitive).toEqual(["young children"]);
    expect(situation.facts).toHaveLength(8);
  });

  it("leaves parts of the day without a forecast empty", () => {
    expect(assessSituation(FAMILY, report({ outlook: [] })).parts.morning).toBeNull();
  });
});
