import { describe, expect, it } from "vitest";
import {
  AQI_CATEGORIES,
  categoryForPm25,
  categoryOf,
  indianAqi,
  isUnhealthy,
  subIndex,
} from "@/lib/domain/aqi";

describe("subIndex", () => {
  it.each([
    [0, 0],
    [30, 50],
    [45, 75],
    [60, 100],
    [90, 200],
    [120, 300],
    [250, 400],
    [380, 500],
    [600, 500],
  ])("maps PM2.5 %d µg/m³ to %d on CPCB's bands", (concentration, index) => {
    expect(subIndex("pm25", concentration)).toBe(index);
  });

  it.each([
    [50, 50],
    [100, 100],
    [175, 150],
    [350, 300],
    [430, 400],
    [900, 500],
  ])("maps PM10 %d µg/m³ to %d", (concentration, index) => {
    expect(subIndex("pm10", concentration)).toBe(index);
  });
});

describe("categoryOf", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "satisfactory"],
    [100, "satisfactory"],
    [101, "moderate"],
    [201, "poor"],
    [301, "very-poor"],
    [400, "very-poor"],
    [401, "severe"],
  ])("puts %d in %s", (aqi, category) => {
    expect(categoryOf(aqi)).toBe(category);
  });

  it("reads a PM2.5 level straight into a category", () => {
    expect(categoryForPm25(25)).toBe("good");
    expect(categoryForPm25(150)).toBe("very-poor");
  });
});

describe("indianAqi", () => {
  it("takes the highest sub-index and names the pollutant that set it", () => {
    expect(indianAqi({ pm25: 45, pm10: 300 })).toEqual({
      value: 250,
      category: "poor",
      dominant: "pm10",
    });
    expect(indianAqi({ pm25: 150, pm10: 120 })).toEqual({
      value: 323,
      category: "very-poor",
      dominant: "pm25",
    });
  });

  it("works from PM2.5 alone when PM10 isn't reported", () => {
    expect(indianAqi({ pm25: 20, pm10: null })).toEqual({
      value: 33,
      category: "good",
      dominant: "pm25",
    });
  });
});

describe("unhealthy categories", () => {
  it("treats Poor and worse as unhealthy for everyone", () => {
    expect(AQI_CATEGORIES.filter(isUnhealthy)).toEqual(["poor", "very-poor", "severe"]);
  });
});
