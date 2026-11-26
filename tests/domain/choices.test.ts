import { describe, expect, it } from "vitest";
import { compareModes, dayDose } from "@/lib/domain/choices";

describe("dayDose", () => {
  const today = { outdoorPm25: 150, outdoorMinutes: 60, mask: "none" as const, purifier: false };

  it("adds the outdoor hour and the indoor rest of the day", () => {
    // Outdoors: 150 × 1.0 × 1 h = 150 µg. Indoors: 105 × 0.5 × 23 h = 1207.5 µg.
    expect(dayDose(today)).toEqual({ micrograms: 1358, cigarettes: 4.9 });
  });

  it("falls with an N95 and a purifier, and caps outdoor time at a day", () => {
    const protectedDay = dayDose({ ...today, mask: "n95", purifier: true });
    expect(protectedDay.micrograms).toBe(555);
    expect(protectedDay.cigarettes).toBeLessThan(dayDose(today).cigarettes);
    expect(dayDose({ ...today, outdoorMinutes: 2000 }).micrograms).toBe(3600);
  });
});

describe("compareModes", () => {
  it("costs every travel mode for the same trip", () => {
    const modes = compareModes(15, 5);
    expect(modes.map((m) => m.mode)).toEqual([
      "walk",
      "cycle",
      "two-wheeler",
      "auto",
      "bus",
      "metro",
      "car",
    ]);
    const car = modes.find((m) => m.mode === "car");
    expect(car?.kgPerWeek).toBeCloseTo(21);
    expect(car?.rupeesPerWeek).toBeCloseTo(878, 0);
    expect(car?.openAir).toBe(false);
    const walk = modes.find((m) => m.mode === "walk");
    expect(walk).toMatchObject({
      kgPerWeek: 0,
      rupeesPerWeek: null,
      minutesPerDay: 360,
      openAir: true,
    });
    expect(modes.find((m) => m.mode === "auto")?.rupeesPerWeek).toBeNull();
  });
});
