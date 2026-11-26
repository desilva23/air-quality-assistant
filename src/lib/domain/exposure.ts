// How much of the outdoor PM2.5 a person actually breathes in, and how much a
// choice changes that. These are planning estimates, not measurements; every
// constant is listed under Assumptions in the README.

import type { CommuteMode, Mask } from "./household";

/**
 * Share of PM2.5 a mask keeps out as people typically wear it. Below the lab
 * ratings (95% for an N95) because of gaps at the edges.
 */
const MASK_PROTECTION: Record<Mask, number> = {
  none: 0,
  cloth: 0.15,
  surgical: 0.35,
  n95: 0.75,
};

/** Indoor PM2.5 as a share of outdoor, with windows mostly shut. */
export const INDOOR_SHARE = { withoutPurifier: 0.7, withPurifier: 0.3 } as const;

/** Door-to-door city speeds, km/h, used to turn a commute distance into time outside. */
const SPEED_KMH: Record<Exclude<CommuteMode, "none">, number> = {
  walk: 5,
  cycle: 12,
  "two-wheeler": 22,
  auto: 18,
  bus: 15,
  metro: 28,
  car: 22,
};

/**
 * Berkeley Earth's rule of thumb: breathing 22 µg/m³ of PM2.5 for a day does
 * about as much harm as smoking one cigarette.
 */
const PM25_PER_CIGARETTE = 22;

/** Minutes a day spent commuting, both ways. */
export function commuteMinutes(mode: CommuteMode, oneWayKm: number): number {
  if (mode === "none") return 0;
  return Math.round(((2 * oneWayKm) / SPEED_KMH[mode]) * 60);
}

/** How much smaller `after` is than `before`, as a whole percentage. */
export function reductionPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}

/** Cut in inhaled dose from switching masks, as a whole percentage. */
export function maskReduction(current: Mask, better: Mask): number {
  return reductionPercent(1 - MASK_PROTECTION[current], 1 - MASK_PROTECTION[better]);
}

/** Indoor PM2.5 estimate for an outdoor level. */
export function indoorPm25(outdoor: number, purifier: boolean): number {
  return outdoor * (purifier ? INDOOR_SHARE.withPurifier : INDOOR_SHARE.withoutPurifier);
}

/** Cigarette-equivalents for a day at this PM2.5 level, to one decimal place. */
export function cigarettesPerDay(pm25: number): number {
  return Math.round((pm25 / PM25_PER_CIGARETTE) * 10) / 10;
}
