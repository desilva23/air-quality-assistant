import { describe, expect, it } from "vitest";
import { cleanestWindow, hoursFor, partAverages, peakHour, usualWindow } from "@/lib/domain/timing";
import { DAY_VALUES, outlookFrom } from "../support/fixtures";

const day = outlookFrom(DAY_VALUES);

describe("timing", () => {
  it("finds the cleanest waking hour of the coming day", () => {
    expect(cleanestWindow(day)).toEqual({ start: "2026-11-26T14:00:00+05:30", average: 70 });
  });

  it("finds the cleanest stretch for a longer activity, keeping the earliest on a tie", () => {
    expect(cleanestWindow(day, 2)).toEqual({ start: "2026-11-26T13:00:00+05:30", average: 75 });
  });

  it("ignores night hours and anything past the next 24 hours", () => {
    const nightIsCleanest = outlookFrom([10, 10, 10, 10, 10, 10, 100, 90, ...Array(22).fill(95)]);
    expect(cleanestWindow(nightIsCleanest)?.start).toBe("2026-11-26T07:00:00+05:30");
  });

  it("reads the usual time for each part of the day", () => {
    expect(usualWindow(day, "evening")).toEqual({
      start: "2026-11-26T18:00:00+05:30",
      average: 210,
    });
    expect(usualWindow(day, "morning", 2)?.average).toBe(240);
  });

  it("averages each part of the day", () => {
    const averages = partAverages(day);
    expect(averages.morning).toBeCloseTo(198.33, 1);
    expect(averages.afternoon).toBe(84);
    expect(averages.evening).toBe(200);
  });

  it("finds the peak hour", () => {
    expect(peakHour(day)).toEqual({ time: "2026-11-26T07:00:00+05:30", pm25: 250 });
  });

  it("returns nothing when there is no forecast", () => {
    expect(cleanestWindow([])).toBeNull();
    expect(usualWindow([], "morning")).toBeNull();
    expect(peakHour([])).toBeNull();
    expect(partAverages([])).toEqual({ morning: null, afternoon: null, evening: null });
  });

  it("rounds activity length up to whole hours, at least one", () => {
    expect(hoursFor(0)).toBe(1);
    expect(hoursFor(60)).toBe(1);
    expect(hoursFor(61)).toBe(2);
  });
});
