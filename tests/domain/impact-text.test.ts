import { describe, expect, it } from "vitest";
import { impactFacts, type ImpactId } from "@/lib/domain/impacts";
import { FAMILY, household, report } from "../support/fixtures";

const TAMIL = /[஀-௿]/;
const textOf = (facts: { id: ImpactId; text: string }[], id: ImpactId) =>
  facts.find((fact) => fact.id === id)?.text ?? "";

describe("impact facts in Tamil", () => {
  const facts = impactFacts(FAMILY, report(), "ta");

  it("word every impact in Tamil with the same numbers as the English", () => {
    const english = impactFacts(FAMILY, report(), "en");
    expect(facts.map((fact) => fact.id)).toEqual(english.map((fact) => fact.id));
    for (const fact of facts) expect(fact.text).toMatch(TAMIL);
    expect(textOf(facts, "shift-activity")).toContain("67%");
    expect(textOf(facts, "shift-activity")).toContain("குழந்தைகளின் வெளி விளையாட்டு");
    expect(textOf(facts, "move-indoors")).toContain("சுத்திகரிப்பான் இயங்கினால் இன்னும் அதிகம்");
    expect(textOf(facts, "mask")).toContain("முகக்கவசம் இல்லாமல் இருப்பதை விட");
    expect(textOf(facts, "purifier")).toContain("105");
    expect(textOf(facts, "ventilate")).toContain("250");
    expect(textOf(facts, "commute-switch")).toContain("காருக்குப் பதில்");
    expect(textOf(facts, "commute-switch")).toContain("19 கி.கி. CO₂ மற்றும் ₹880 பெட்ரோல்");
    expect(textOf(facts, "carpool")).toContain("₹590");
    expect(textOf(facts, "remote-day")).toContain(
      "82 நிமிடச் சாலைப் பயணம், சுமார் 4.2 கி.கி. CO₂ மற்றும் ₹180 பெட்ரோல்",
    );
  });

  it("drop the petrol for an auto, the CO₂ and petrol for a walk, and credit a purifier", () => {
    const auto = { ...FAMILY, commute: { mode: "auto" as const, distanceKm: 8, daysPerWeek: 5 } };
    expect(textOf(impactFacts(auto, report(), "ta"), "commute-switch")).not.toContain("பெட்ரோல்");
    expect(textOf(impactFacts(auto, report(), "ta"), "commute-switch")).toContain(
      "ஆட்டோவுக்குப் பதில்",
    );
    const walk = household({ commute: { mode: "walk", distanceKm: 2, daysPerWeek: 5 } });
    expect(textOf(impactFacts(walk, report(), "ta"), "remote-day")).toBe(
      "வாரத்தில் ஒரு நாள் பயணிக்காமல் வீட்டிலிருந்தால் 48 நிமிடச் சாலைப் பயணம் மிச்சமாகும்.",
    );
    const scooter = household({ commute: { mode: "two-wheeler", distanceKm: 10, daysPerWeek: 5 } });
    expect(textOf(impactFacts(scooter, report(), "ta"), "commute-switch")).toContain(
      "ஸ்கூட்டர் அல்லது பைக்குக்குப் பதில்",
    );
    const equipped = { ...FAMILY, home: { ...FAMILY.home, purifier: true } };
    expect(textOf(impactFacts(equipped, report(), "ta"), "move-indoors")).toContain(
      "உங்கள் சுத்திகரிப்பான் இயங்கும்போது",
    );
    const scooterEn = textOf(impactFacts(scooter, report(), "en"), "commute-switch");
    expect(scooterEn).toContain("your scooter or motorbike");
  });

  it("default to English", () => {
    expect(textOf(impactFacts(FAMILY, report()), "carpool")).toMatch(/^Sharing the car/);
  });
});
