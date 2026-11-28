import { describe, expect, it } from "vitest";
import { distanceKm, isInIndia, roundCoordinate } from "@/lib/domain/geo";
import { formatClock, istHour } from "@/lib/domain/time";

describe("geography", () => {
  it("accepts Indian cities and rejects places clearly elsewhere", () => {
    expect(isInIndia({ latitude: 28.61, longitude: 77.21 })).toBe(true);
    expect(isInIndia({ latitude: 8.5, longitude: 76.9 })).toBe(true);
    expect(isInIndia({ latitude: 51.5, longitude: -0.12 })).toBe(false);
    expect(isInIndia({ latitude: 25, longitude: 55 })).toBe(false);
  });

  it("rounds coordinates to about a kilometre", () => {
    expect(roundCoordinate(28.61394)).toBeCloseTo(28.61, 10);
    expect(roundCoordinate(77.2099)).toBeCloseTo(77.21, 10);
  });

  it("measures great-circle distance", () => {
    expect(
      distanceKm({ latitude: 28.61, longitude: 77.21 }, { latitude: 28.61, longitude: 77.21 }),
    ).toBe(0);
    // New Delhi to Mumbai is about 1,150 km as the crow flies.
    const km = distanceKm(
      { latitude: 28.61, longitude: 77.21 },
      { latitude: 19.08, longitude: 72.88 },
    );
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1200);
  });
});

describe("IST time", () => {
  it("reads the hour in IST whatever offset the timestamp carries", () => {
    expect(istHour("2026-11-26T14:00:00+05:30")).toBe(14);
    expect(istHour("2026-11-25T18:30:00Z")).toBe(0);
  });

  it("formats a clock time in IST", () => {
    expect(formatClock("2026-11-26T14:00:00+05:30")).toBe("2:00 pm");
    expect(formatClock("2026-11-25T18:30:00Z")).toBe("12:00 am");
  });
});

describe("hour labels", () => {
  it("formats an hour for a chart axis in IST", async () => {
    const { formatHour } = await import("@/lib/domain/time");
    expect(formatHour("2026-11-26T14:00:00+05:30")).toBe("2 pm");
    expect(formatHour("2026-11-25T18:30:00Z")).toBe("12 am");
  });
});
