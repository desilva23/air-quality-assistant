import { describe, expect, it } from "vitest";
import {
  commuteKgPerDay,
  formatKg,
  formatRupees,
  isPetrolVehicle,
  petrolRupees,
  weeklySavingKg,
} from "@/lib/domain/emissions";
import {
  cigarettesPerDay,
  commuteMinutes,
  indoorPm25,
  maskReduction,
  reductionPercent,
  whoMultiple,
} from "@/lib/domain/exposure";

describe("exposure", () => {
  it("turns a commute into minutes outside, both ways", () => {
    expect(commuteMinutes("none", 10)).toBe(0);
    expect(commuteMinutes("walk", 2.5)).toBe(60);
    expect(commuteMinutes("car", 15)).toBe(82);
  });

  it("expresses a change as a whole-number cut, never negative", () => {
    expect(reductionPercent(210, 70)).toBe(67);
    expect(reductionPercent(100, 120)).toBe(0);
    expect(reductionPercent(0, 10)).toBe(0);
  });

  it("compares masks as typically worn", () => {
    expect(maskReduction("none", "n95")).toBe(75);
    expect(maskReduction("cloth", "n95")).toBe(71);
    expect(maskReduction("n95", "n95")).toBe(0);
  });

  it("estimates indoor PM2.5 with and without a purifier", () => {
    expect(indoorPm25(100, false)).toBeCloseTo(70);
    expect(indoorPm25(100, true)).toBeCloseTo(30);
  });

  it("compares PM2.5 with the WHO 24-hour guideline", () => {
    expect(whoMultiple(150)).toBe(10);
    expect(whoMultiple(89)).toBeCloseTo(5.9, 10);
    expect(whoMultiple(8)).toBe(0.5);
  });

  it("converts a day's PM2.5 into cigarette-equivalents", () => {
    expect(cigarettesPerDay(22)).toBe(1);
    expect(cigarettesPerDay(150)).toBeCloseTo(6.8, 10);
  });
});

describe("emissions", () => {
  it("uses India GHG Program factors, both ways, shared by the car's occupants", () => {
    expect(commuteKgPerDay("car", 15)).toBeCloseTo(4.2);
    expect(commuteKgPerDay("car", 15, 3)).toBeCloseTo(1.4);
    expect(commuteKgPerDay("two-wheeler", 10)).toBeCloseTo(0.736);
    expect(commuteKgPerDay("walk", 5)).toBe(0);
  });

  it("works out the weekly saving of a switch, never negative", () => {
    expect(weeklySavingKg("car", "metro", 15, 5)).toBeCloseTo(18.73, 1);
    expect(weeklySavingKg("bus", "car", 15, 5)).toBe(0);
  });

  it("prices the petrol behind the CO₂, for petrol vehicles only", () => {
    expect(isPetrolVehicle("car")).toBe(true);
    expect(isPetrolVehicle("two-wheeler")).toBe(true);
    expect(isPetrolVehicle("auto")).toBe(false);
    // 2.27193 kg of CO₂ is one litre of petrol, at ₹95.
    expect(petrolRupees(2.27193)).toBeCloseTo(95);
  });

  it("formats rupees with Indian digit grouping, to the nearest ₹10 above ₹100", () => {
    expect(formatRupees(42.4)).toBe("₹42");
    expect(formatRupees(878)).toBe("₹880");
    expect(formatRupees(123_456)).toBe("₹1,23,460");
  });

  it("rounds for reading", () => {
    expect(formatKg(4.24)).toBe("4.2");
    expect(formatKg(18.73)).toBe("19");
  });
});
