import type { PlanRequest } from "@/lib/ai/contracts";
import type { AirReport, OutlookHour, Place, Reading } from "@/lib/domain/air";
import { DEFAULT_HOUSEHOLD, type Household } from "@/lib/domain/household";

/** Hourly forecast from midnight IST on 26 Nov 2026, one value per hour. */
export function outlookFrom(values: number[], startHour = 0): OutlookHour[] {
  return values.map((pm25, index) => {
    const hour = startHour + index;
    const day = 26 + Math.floor(hour / 24);
    const time = `2026-11-${String(day)}T${String(hour % 24).padStart(2, "0")}:00:00+05:30`;
    return { time, pm25 };
  });
}

/** A smoggy winter day: bad mornings and evenings, a cleaner afternoon (70 at 2 pm). */
export const DAY_VALUES = [
  200, 200, 200, 200, 200, 200, 240, 250, 230, 200, 150, 120, 90, 80, 70, 80, 100, 180, 210, 220,
  200, 190, 200, 200, 210, 210,
];

export const PLACE: Place = {
  name: "New Delhi",
  region: "Delhi",
  latitude: 28.61,
  longitude: 77.21,
};

export const STATION_READING: Reading = {
  pm25: 150,
  pm10: 220,
  measuredAt: "2026-11-25T18:30:00Z",
  kind: "station",
  source: "OpenAQ (CPCB)",
  station: "ITO, Delhi",
  distanceKm: 3.2,
};

export const MODEL_READING: Reading = {
  pm25: 140,
  pm10: null,
  measuredAt: "2026-11-26T00:00:00+05:30",
  kind: "model",
  source: "Open-Meteo (CAMS model)",
  station: null,
  distanceKm: null,
};

export function report(overrides: Partial<AirReport> = {}): AirReport {
  return {
    reading: STATION_READING,
    outlook: outlookFrom(DAY_VALUES),
    outlookSource: "Open-Meteo (CAMS model)",
    note: null,
    ...overrides,
  };
}

export const FAMILY: Household = {
  members: { children: true, seniors: false, respiratory: false, pregnant: false },
  commute: { mode: "car", distanceKm: 15, daysPerWeek: 5 },
  activity: { kind: "outdoor-play", partOfDay: "evening", minutes: 60 },
  home: { purifier: false, cooking: "gas", smoker: false },
  mask: "none",
};

export function household(patch: Partial<Household> = {}): Household {
  return { ...DEFAULT_HOUSEHOLD, ...patch };
}

export function planRequest(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return { place: PLACE, household: FAMILY, report: report(), ...overrides };
}
