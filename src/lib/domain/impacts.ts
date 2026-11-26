// The direct impact of each choice, computed rather than guessed. The AI may
// only cite these facts by id, so every number a user reads comes from here.
// This file works out the numbers; impact-text.ts words them in each language.

import * as z from "../zod";
import type { Language } from "../i18n/language";
import type { AirReport } from "./air";
import { commuteKgPerDay, isPetrolVehicle, petrolRupees, weeklySavingKg } from "./emissions";
import {
  commuteMinutes,
  INDOOR_SHARE,
  indoorPm25,
  maskReduction,
  reductionPercent,
} from "./exposure";
import {
  isOpenAirMode,
  isPrivateVehicle,
  type Activity,
  type Household,
  type PrivateVehicle,
} from "./household";
import { describeImpact } from "./impact-text";
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

export const ImpactFactSchema = z.object({
  id: z.enum(IMPACT_IDS),
  text: z.string().check(z.maxLength(400)),
});

export type ImpactFact = z.infer<typeof ImpactFactSchema>;

type Doing = Exclude<Activity, "none">;

/** What each impact measured, before it is put into words. */
export type ImpactData =
  | {
      id: "shift-activity";
      activity: Doing;
      minutes: number;
      from: string;
      to: string;
      cut: number;
      best: number;
      usual: number;
    }
  | { id: "move-indoors"; activity: Doing; cut: number; purifier: boolean }
  | { id: "mask"; current: Household["mask"]; minutes: number; cut: number }
  | { id: "purifier"; withPurifier: number; withoutPurifier: number }
  | { id: "ventilate"; at: string; best: number; peak: number; peakAt: string }
  | { id: "commute-switch"; vehicle: PrivateVehicle; km: number; kg: number; rupees: number | null }
  | { id: "carpool"; kg: number; rupees: number }
  | { id: "remote-day"; minutes: number; kg: number | null; rupees: number | null };

interface Context {
  household: Household;
  report: AirReport;
}

/** A change smaller than this isn't worth a recommendation. */
const MIN_SHIFT_PERCENT = 10;
const MIN_KG = 0.1;
const round = Math.round;

function shiftActivity({ household, report }: Context): ImpactData | null {
  const { kind, partOfDay, minutes } = household.activity;
  if (kind === "none" || minutes === 0) return null;
  const hours = hoursFor(minutes);
  const usual = usualWindow(report.outlook, partOfDay, hours);
  const best = cleanestWindow(report.outlook, hours);
  if (!usual || !best) return null;
  const cut = reductionPercent(usual.average, best.average);
  if (cut < MIN_SHIFT_PERCENT) return null;
  const [from, to] = [usual.start, best.start];
  return {
    id: "shift-activity",
    activity: kind,
    minutes,
    from,
    to,
    cut,
    best: round(best.average),
    usual: round(usual.average),
  };
}

function moveIndoors({ household }: Context): ImpactData | null {
  const { kind } = household.activity;
  if (kind === "none") return null;
  const { purifier } = household.home;
  const share = purifier ? INDOOR_SHARE.withPurifier : INDOOR_SHARE.withoutPurifier;
  return { id: "move-indoors", activity: kind, cut: reductionPercent(1, share), purifier };
}

/** Minutes a day breathing street air: open-air commuting plus the outdoor activity. */
export function outdoorMinutes({ commute, activity }: Household): number {
  const travel = isOpenAirMode(commute.mode) ? commuteMinutes(commute.mode, commute.distanceKm) : 0;
  return travel + (activity.kind === "none" ? 0 : activity.minutes);
}

function mask({ household }: Context): ImpactData | null {
  const minutes = outdoorMinutes(household);
  if (household.mask === "n95" || minutes === 0) return null;
  return {
    id: "mask",
    current: household.mask,
    minutes,
    cut: maskReduction(household.mask, "n95"),
  };
}

function purifier({ household, report }: Context): ImpactData | null {
  if (household.home.purifier) return null;
  const outdoor = report.reading.pm25;
  return {
    id: "purifier",
    withPurifier: round(indoorPm25(outdoor, true)),
    withoutPurifier: round(indoorPm25(outdoor, false)),
  };
}

function ventilate({ report }: Context): ImpactData | null {
  const best = cleanestWindow(report.outlook);
  const peak = peakHour(report.outlook);
  if (!best || !peak || peak.pm25 < best.average * 1.2) return null;
  return {
    id: "ventilate",
    at: best.start,
    best: round(best.average),
    peak: round(peak.pm25),
    peakAt: peak.time,
  };
}

function commuteSwitch({ household }: Context): ImpactData | null {
  const { mode, distanceKm, daysPerWeek } = household.commute;
  if (!isPrivateVehicle(mode)) return null;
  const kg = weeklySavingKg(mode, "metro", distanceKm, daysPerWeek);
  if (kg < MIN_KG) return null;
  const weeklyPetrol = petrolRupees(commuteKgPerDay(mode, distanceKm) * daysPerWeek);
  return {
    id: "commute-switch",
    vehicle: mode,
    km: distanceKm,
    kg,
    rupees: isPetrolVehicle(mode) ? weeklyPetrol : null,
  };
}

function carpool({ household }: Context): ImpactData | null {
  const { mode, distanceKm, daysPerWeek } = household.commute;
  if (mode !== "car") return null;
  const perDay = commuteKgPerDay("car", distanceKm) - commuteKgPerDay("car", distanceKm, 3);
  const kg = perDay * daysPerWeek;
  if (kg < MIN_KG) return null;
  return { id: "carpool", kg, rupees: petrolRupees(kg) };
}

function remoteDay({ household }: Context): ImpactData | null {
  const { mode, distanceKm, daysPerWeek } = household.commute;
  if (mode === "none" || daysPerWeek === 0 || distanceKm === 0) return null;
  const kg = commuteKgPerDay(mode, distanceKm);
  return {
    id: "remote-day",
    minutes: commuteMinutes(mode, distanceKm),
    kg: kg >= MIN_KG ? kg : null,
    rupees: isPetrolVehicle(mode) ? petrolRupees(kg) : null,
  };
}

const MEASURES = [
  shiftActivity,
  moveIndoors,
  mask,
  purifier,
  ventilate,
  commuteSwitch,
  carpool,
  remoteDay,
];

/** Every impact that applies to this household today, as numbers. */
function impactData(household: Household, report: AirReport): ImpactData[] {
  return MEASURES.map((measure) => measure({ household, report })).filter((data) => data !== null);
}

/** Every impact that applies to this household today, worded in `language`. */
export function impactFacts(
  household: Household,
  report: AirReport,
  language: Language = "en",
): ImpactFact[] {
  return impactData(household, report).map((data) => ({
    id: data.id,
    text: describeImpact(data, language),
  }));
}
