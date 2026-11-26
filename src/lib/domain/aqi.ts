// India's National Air Quality Index (CPCB). Each pollutant's concentration
// maps to a sub-index by linear interpolation within its band, and the AQI is
// the highest sub-index. CPCB averages particulates over 24 hours; the app
// applies the same bands to the latest hourly reading, so its AQI is indicative.

export const AQI_CATEGORIES = [
  "good",
  "satisfactory",
  "moderate",
  "poor",
  "very-poor",
  "severe",
] as const;

export type AqiCategory = (typeof AQI_CATEGORIES)[number];

export type Pollutant = "pm25" | "pm10";

interface Band {
  /** Highest concentration in the band, µg/m³. */
  upTo: number;
  /** Index value at that concentration. */
  index: number;
}

/**
 * CPCB leaves the Severe band open-ended (PM2.5 above 250, PM10 above 430).
 * 380 and 510 close it, a common convention, and anything beyond reads as 500.
 */
const BANDS: Record<Pollutant, readonly Band[]> = {
  pm25: [
    { upTo: 30, index: 50 },
    { upTo: 60, index: 100 },
    { upTo: 90, index: 200 },
    { upTo: 120, index: 300 },
    { upTo: 250, index: 400 },
    { upTo: 380, index: 500 },
  ],
  pm10: [
    { upTo: 50, index: 50 },
    { upTo: 100, index: 100 },
    { upTo: 250, index: 200 },
    { upTo: 350, index: 300 },
    { upTo: 430, index: 400 },
    { upTo: 510, index: 500 },
  ],
};

const AQI_MAX = 500;

export function subIndex(pollutant: Pollutant, concentration: number): number {
  let from: Band = { upTo: 0, index: 0 };
  for (const band of BANDS[pollutant]) {
    if (concentration <= band.upTo) {
      const share = (concentration - from.upTo) / (band.upTo - from.upTo);
      return Math.round(from.index + share * (band.index - from.index));
    }
    from = band;
  }
  return AQI_MAX;
}

/** Highest index value in each category, in order. */
const CATEGORY_TOPS: readonly [number, AqiCategory][] = [
  [50, "good"],
  [100, "satisfactory"],
  [200, "moderate"],
  [300, "poor"],
  [400, "very-poor"],
];

export function categoryOf(aqi: number): AqiCategory {
  return CATEGORY_TOPS.find(([top]) => aqi <= top)?.[1] ?? "severe";
}

export function categoryForPm25(concentration: number): AqiCategory {
  return categoryOf(subIndex("pm25", concentration));
}

export interface AqiResult {
  value: number;
  category: AqiCategory;
  /** The pollutant that set the index. */
  dominant: Pollutant;
}

export function indianAqi({ pm25, pm10 }: { pm25: number; pm10: number | null }): AqiResult {
  const fine = subIndex("pm25", pm25);
  const coarse = pm10 === null ? -1 : subIndex("pm10", pm10);
  const value = Math.max(fine, coarse);
  return { value, category: categoryOf(value), dominant: coarse > fine ? "pm10" : "pm25" };
}

export const CATEGORY_LABEL: Record<AqiCategory, string> = {
  good: "Good",
  satisfactory: "Satisfactory",
  moderate: "Moderate",
  poor: "Poor",
  "very-poor": "Very poor",
  severe: "Severe",
};

/** CPCB's published health impact for each category. */
export const CATEGORY_HEALTH: Record<AqiCategory, string> = {
  good: "Minimal impact.",
  satisfactory: "Minor breathing discomfort for sensitive people.",
  moderate:
    "Breathing discomfort for people with asthma or other lung disease, heart disease, children and older adults.",
  poor: "Breathing discomfort for most people on prolonged exposure.",
  "very-poor": "Respiratory illness on prolonged exposure.",
  severe: "Affects healthy people and seriously affects those with existing diseases.",
};

/** Categories where outdoor exertion should be cut back for everyone. */
export function isUnhealthy(category: AqiCategory): boolean {
  return AQI_CATEGORIES.indexOf(category) >= AQI_CATEGORIES.indexOf("poor");
}
