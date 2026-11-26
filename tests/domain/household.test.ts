import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOUSEHOLD,
  HouseholdSchema,
  isOpenAirMode,
  isPrivateVehicle,
  sensitiveGroups,
} from "@/lib/domain/household";
import { FAMILY, household } from "../support/fixtures";

describe("household", () => {
  it("accepts the default and the sample family", () => {
    expect(HouseholdSchema.parse(DEFAULT_HOUSEHOLD)).toEqual(DEFAULT_HOUSEHOLD);
    expect(HouseholdSchema.parse(FAMILY)).toEqual(FAMILY);
  });

  it("rejects values out of range", () => {
    const tooFar = { ...FAMILY, commute: { ...FAMILY.commute, distanceKm: 500 } };
    const badDays = { ...FAMILY, commute: { ...FAMILY.commute, daysPerWeek: 2.5 } };
    expect(HouseholdSchema.safeParse(tooFar).success).toBe(false);
    expect(HouseholdSchema.safeParse(badDays).success).toBe(false);
  });

  it("names the people who need most care, in plain words", () => {
    expect(sensitiveGroups(household())).toEqual([]);
    const everyone = household({
      members: { children: true, seniors: true, respiratory: true, pregnant: true },
    });
    expect(sensitiveGroups(everyone)).toEqual([
      "young children",
      "older adults",
      "someone with asthma, COPD or a heart condition",
      "a pregnant family member",
    ]);
  });

  it("knows which travel modes breathe street air and which burn private fuel", () => {
    expect(isOpenAirMode("two-wheeler")).toBe(true);
    expect(isOpenAirMode("metro")).toBe(false);
    expect(isPrivateVehicle("car")).toBe(true);
    expect(isPrivateVehicle("bus")).toBe(false);
  });
});
