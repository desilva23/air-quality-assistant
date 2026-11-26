// The direct impact of each choice, computed rather than guessed. The AI may
// only cite these facts by id, so every number a user reads comes from here.

import { z } from "../zod";
import type { AirReport } from "./air";
import { commuteKgPerDay, formatKg, weeklySavingKg } from "./emissions";
import {
  commuteMinutes,
  INDOOR_SHARE,
  indoorPm25,
  maskReduction,
  reductionPercent,
} from "./exposure";
import {
  ACTIVITY_NOUN,
  isOpenAirMode,
  type CommuteMode,
  type Household,
  type Mask,
} from "./household";
import { formatClock } from "./time";
import { cleanestWindow, hoursFor, peakHour, usualWindow } from "./timing";

export const IMPACT_IDS = [
  "shift-activity",
  "move-indoors",
  "mask",
  "purifier",
  "ventilate",
  "commute-switch",
  "carpool",
  "remote-day",
] as const;

export type ImpactId = (typeof IMPACT_IDS)[number];

export const ImpactFactSchema = z.object({ id: z.enum(IMPACT_IDS), text: z.string().max(300) });

export type ImpactFact = z.infer<typeof ImpactFactSchema>;

interface Context {
  household: Household;
  report: AirReport;
}

/** A change smaller than this isn't worth a recommendation. */
const MIN_SHIFT_PERCENT = 10;
const MIN_KG = 0.1;

const MASK_PHRASE: Record<Mask, string> = {
  none: "no mask",
  cloth: "a cloth mask",
  surgical: "a surgical mask",
  n95: "an N95",
};

/** Private vehicles: fuel the traveller could choose not to burn. */
const VEHICLE_NOUN: Partial<Record<CommuteMode, string>> = {
  "two-wheeler": "scooter or motorbike",
  auto: "auto-rickshaw",
  car: "car",
};

const round = Math.round;

function shiftActivity({ household, report }: Context): ImpactFact | null {
  const { kind, partOfDay, minutes } = household.activity;
  if (kind === "none" || minutes === 0) return null;
  const hours = hoursFor(minutes);
  const usual = usualWindow(report.outlook, partOfDay, hours);
  const best = cleanestWindow(report.outlook, hours);
  if (!usual || !best) return null;
  const cut = reductionPercent(usual.average, best.average);
  if (cut < MIN_SHIFT_PERCENT) return null;
  return {
    id: "shift-activity",
    text: `Moving your ${minutes}-minute ${ACTIVITY_NOUN[kind]} from ${formatClock(usual.start)} to ${formatClock(best.start)} cuts the PM2.5 you breathe during it by about ${cut}% (forecast ${round(best.average)} vs ${round(usual.average)} µg/m³).`,
  };
}

function moveIndoors({ household }: Context): ImpactFact | null {
  const { kind } = household.activity;
  if (kind === "none") return null;
  const { purifier } = household.home;
  const cut = reductionPercent(
    1,
    purifier ? INDOOR_SHARE.withPurifier : INDOOR_SHARE.withoutPurifier,
  );
  const tail = purifier ? " with your purifier running" : ", and more with a purifier running";
  return {
    id: "move-indoors",
    text: `Doing the ${ACTIVITY_NOUN[kind]} indoors instead cuts that dose by about ${cut}%${tail}.`,
  };
}

/** Minutes a day breathing street air: open-air commuting plus the outdoor activity. */
export function outdoorMinutes({ commute, activity }: Household): number {
  const travel = isOpenAirMode(commute.mode) ? commuteMinutes(commute.mode, commute.distanceKm) : 0;
  return travel + (activity.kind === "none" ? 0 : activity.minutes);
}

function mask({ household }: Context): ImpactFact | null {
  const minutes = outdoorMinutes(household);
  if (household.mask === "n95" || minutes === 0) return null;
  return {
    id: "mask",
    text: `A well-fitted N95 instead of ${MASK_PHRASE[household.mask]} cuts what you breathe in during your ${minutes} minutes outdoors by about ${maskReduction(household.mask, "n95")}%.`,
  };
}

function purifier({ household, report }: Context): ImpactFact | null {
  if (household.home.purifier) return null;
  const outdoor = report.reading.pm25;
  return {
    id: "purifier",
    text: `A purifier sized for the bedroom, with windows shut, could keep indoor PM2.5 near ${round(indoorPm25(outdoor, true))} instead of about ${round(indoorPm25(outdoor, false))} µg/m³ at today's outdoor level.`,
  };
}

function ventilate({ report }: Context): ImpactFact | null {
  const best = cleanestWindow(report.outlook);
  const peak = peakHour(report.outlook);
  if (!best || !peak || peak.pm25 < best.average * 1.2) return null;
  return {
    id: "ventilate",
    text: `Air the home for 10–15 minutes around ${formatClock(best.start)}, the cleanest hour forecast (${round(best.average)} µg/m³, against a peak of ${round(peak.pm25)} at ${formatClock(peak.time)}).`,
  };
}

function commuteSwitch({ household }: Context): ImpactFact | null {
  const { mode, distanceKm, daysPerWeek } = household.commute;
  const vehicle = VEHICLE_NOUN[mode];
  if (!vehicle) return null;
  const kg = weeklySavingKg(mode, "metro", distanceKm, daysPerWeek);
  if (kg < MIN_KG) return null;
  return {
    id: "commute-switch",
    text: `Taking the metro or a bus instead of your ${vehicle} for ${distanceKm} km each way saves about ${formatKg(kg)} kg of CO₂ a week.`,
  };
}

function carpool({ household }: Context): ImpactFact | null {
  const { mode, distanceKm, daysPerWeek } = household.commute;
  if (mode !== "car") return null;
  const perDay = commuteKgPerDay("car", distanceKm) - commuteKgPerDay("car", distanceKm, 3);
  const kg = perDay * daysPerWeek;
  if (kg < MIN_KG) return null;
  return {
    id: "carpool",
    text: `Sharing the car with two others cuts your share of its CO₂ by about ${formatKg(kg)} kg a week.`,
  };
}

function remoteDay({ household }: Context): ImpactFact | null {
  const { mode, distanceKm, daysPerWeek } = household.commute;
  if (mode === "none" || daysPerWeek === 0 || distanceKm === 0) return null;
  const kg = commuteKgPerDay(mode, distanceKm);
  const co2 = kg >= MIN_KG ? ` and about ${formatKg(kg)} kg of CO₂` : "";
  return {
    id: "remote-day",
    text: `One day a week at home instead of commuting saves ${commuteMinutes(mode, distanceKm)} minutes on the road${co2}.`,
  };
}

const FACTS = [
  shiftActivity,
  moveIndoors,
  mask,
  purifier,
  ventilate,
  commuteSwitch,
  carpool,
  remoteDay,
];

/** Every impact that applies to this household today. */
export function impactFacts(household: Household, report: AirReport): ImpactFact[] {
  return FACTS.map((fact) => fact({ household, report })).filter((fact) => fact !== null);
}
