import { describe, expect, it } from "vitest";
import { AQI_CATEGORIES } from "@/lib/domain/aqi";
import { LABELS, listPhrase } from "@/lib/i18n/labels";
import { LANGUAGE_NAME, LANGUAGES, LanguageSchema } from "@/lib/i18n/language";
import { MESSAGES } from "@/lib/i18n/messages";

const TAMIL = /[஀-௿]/;

/** The numbers and names filled into the messages below, in order. */
const ORDERED_VALUES = [
  "Chennai",
  "Alandur",
  "2:00 PM",
  "6.1",
  "4.2",
  "180",
  "110",
  "7",
  "3.2",
  "164",
  "5.4",
  "1,484",
  "38",
  "15",
];

describe("languages", () => {
  it("offers English and Tamil, each named in its own script", () => {
    expect(LANGUAGES).toEqual(["en", "ta"]);
    expect(LANGUAGE_NAME.ta).toMatch(TAMIL);
    expect(LanguageSchema.safeParse("hi").success).toBe(false);
  });
});

describe("labels", () => {
  it("name every category with CPCB's health note, in both languages", () => {
    for (const language of LANGUAGES) {
      for (const category of AQI_CATEGORIES) {
        expect(LABELS[language].category[category]).toBeTruthy();
        expect(LABELS[language].health[category]).toMatch(/\.$/);
      }
    }
    expect(LABELS.ta.category["very-poor"]).toBe("மிகவும் மோசம்");
  });

  it("join lists with the language's own word for 'and'", () => {
    expect(listPhrase(["a"], "en")).toBe("a");
    expect(listPhrase(["a", "b", "c"], "en")).toBe("a, b and c");
    expect(listPhrase(["அ", "ஆ"], "ta")).toBe("அ மற்றும் ஆ");
    expect(listPhrase([], "en")).toBe("");
  });
});

describe("messages", () => {
  it("word every message with its numbers and names, in both languages", () => {
    for (const language of LANGUAGES) {
      const m = MESSAGES[language];
      const filled = [
        m.sky.rightNow("Chennai"),
        m.sky.measured("Alandur", 2.5, "2:00 PM"),
        m.sky.modelled("2:00 PM"),
        m.sky.scale("PM2.5"),
        m.air.heading("Chennai"),
        m.air.who(6.1),
        m.air.away("Alandur", 2.5),
        m.air.cigarettes(4.2),
        m.chart.cleanest("3:00 PM"),
        m.chart.summary(24, 40, 180),
        m.plan.partForecast("Poor", 110),
        m.stations.intro(7),
        m.stations.km(3.2),
        m.choices.intro(164),
        m.choices.result(5.4, "1,484"),
        m.choices.cut(38),
        m.commute.trip(15, 5),
      ];
      // Every value appears, in the order the messages were filled.
      const joined = filled.join(" ");
      let from = 0;
      for (const value of ORDERED_VALUES) {
        const at = joined.indexOf(value, from);
        expect(at, `${language}: ${value}`).toBeGreaterThanOrEqual(0);
        from = at + value.length;
      }
      if (language === "ta") for (const text of filled) expect(text).toMatch(TAMIL);
    }
  });

  it("have a message for every error code and notice in Tamil", () => {
    expect(Object.values(MESSAGES.ta.errors).every((text) => TAMIL.test(text))).toBe(true);
    expect(MESSAGES.ta.plan.notices["ai-off"]).toMatch(TAMIL);
    expect(MESSAGES.ta.air.notes["no-fresh-station"]).toContain("25");
  });
});
