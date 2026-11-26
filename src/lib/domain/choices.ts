// What-if numbers for the two comparison panels: a day's PM2.5 dose under
// different choices, and every way to make the same commute. Planning
// estimates, built on the same constants as the impacts; listed in the README.

import { commuteKgPerDay, isPetrolVehicle, petrolRupees } from "./emissions";
import { cigarettesPerDay, commuteMinutes, indoorPm25, MASK_PROTECTION } from "./exposure";
import { COMMUTE_MODES, isOpenAirMode, type CommuteMode, type Mask } from "./household";

/** Air breathed per hour: light activity outdoors, resting and sleeping indoors (m³/h). */
const BREATHING_OUTDOORS = 1.0;
const BREATHING_INDOORS = 0.5;
const MINUTES_PER_DAY = 24 * 60;

export interface DayChoices {
  /** Today's outdoor PM2.5, µg/m³. */
  outdoorPm25: number;
  outdoorMinutes: number;
  mask: Mask;
  purifier: boolean;
}

export interface DayDose {
  /** PM2.5 breathed in over the day, µg. */
  micrograms: number;
  /** The same harm as this many cigarettes, by Berkeley Earth's rule of thumb. */
  cigarettes: number;
}

/**
 * The day's PM2.5 dose: outdoor time at the outdoor level, filtered by the
 * mask, plus the rest of the day indoors at the indoor level.
 */
export function dayDose({ outdoorPm25, outdoorMinutes, mask, purifier }: DayChoices): DayDose {
  const outdoorHours = Math.min(outdoorMinutes, MINUTES_PER_DAY) / 60;
  const indoorHours = 24 - outdoorHours;
  const outdoor = outdoorPm25 * BREATHING_OUTDOORS * outdoorHours * (1 - MASK_PROTECTION[mask]);
  const indoor = indoorPm25(outdoorPm25, purifier) * BREATHING_INDOORS * indoorHours;
  const volume = BREATHING_OUTDOORS * outdoorHours + BREATHING_INDOORS * indoorHours;
  const micrograms = outdoor + indoor;
  return { micrograms: Math.round(micrograms), cigarettes: cigarettesPerDay(micrograms / volume) };
}

export interface ModeCost {
  mode: Exclude<CommuteMode, "none">;
  kgPerWeek: number;
  /** Petrol cost a week, for petrol vehicles only. */
  rupeesPerWeek: number | null;
  minutesPerDay: number;
  /** Whether the traveller breathes street air directly. */
  openAir: boolean;
}

/** Every way to make a commute of `oneWayKm`, `daysPerWeek` times a week. */
export function compareModes(oneWayKm: number, daysPerWeek: number): ModeCost[] {
  return COMMUTE_MODES.filter((mode) => mode !== "none").map((mode) => {
    const kgPerWeek = commuteKgPerDay(mode, oneWayKm) * daysPerWeek;
    return {
      mode,
      kgPerWeek,
      rupeesPerWeek: isPetrolVehicle(mode) ? petrolRupees(kgPerWeek) : null,
      minutesPerDay: commuteMinutes(mode, oneWayKm),
      openAir: isOpenAirMode(mode),
    };
  });
}
