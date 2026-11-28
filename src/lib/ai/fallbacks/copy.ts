// The built-in guidance's wording, in English. copy.ta.ts holds the Tamil.
// Rules choose what to say; this says it.

import type { Language } from "../../i18n/language";
import { TAMIL_COPY } from "./copy.ta";

interface Advice {
  action: string;
  why: string;
}

export type IndoorAdvice =
  "getPurifier" | "runPurifier" | "ventilate" | "solidFuel" | "smoker" | "clean";
export type TravelAdvice = "transit" | "carpool" | "remote" | "combine" | "noBurning";

export interface FallbackCopy {
  forecastWhy: (part: string, average: number, category: string) => string;
  airNow: (category: string) => string;
  goAhead: (activity: string) => string;
  moveToCleaner: (activity: string) => string;
  doIndoors: (activity: string) => string;
  deeperBreathing: string;
  maskRide: (homeward: boolean) => string;
  streetAir: string;
  carWindows: (homeward: boolean) => string;
  closedWindows: string;
  keepIndoors: (who: string) => string;
  everyone: string;
  fineOutdoors: (sensitive: boolean) => string;
  headline: (place: string, category: string, aqi: number, care: string | null) => string;
  shareLead: (place: string, category: string, aqi: number, source: string) => string;
  noAnswer: (place: string, category: string, aqi: number) => string;
  extraCare: (groups: string) => string;
  indoor: Record<IndoorAdvice, Advice>;
  travel: Record<TravelAdvice, Advice>;
}

const ENGLISH_COPY: FallbackCopy = {
  forecastWhy: (part, average, category) =>
    `PM2.5 this ${part.toLowerCase()} is forecast to average ${String(average)} µg/m³ (${category}).`,
  airNow: (category) => `Air right now is ${category}.`,
  goAhead: (activity) => `Go ahead with the ${activity}, at an easy pace.`,
  moveToCleaner: (activity) => `Move the ${activity} to the cleaner hour below, or do it indoors.`,
  doIndoors: (activity) => `Do the ${activity} indoors today.`,
  deeperBreathing: " Harder breathing outdoors pulls more particles deep into the lungs.",
  maskRide: (homeward) => `Wear a well-fitted N95 for the ${homeward ? "ride home" : "ride in"}.`,
  streetAir: " You breathe street air directly on this trip.",
  carWindows: (homeward) =>
    `Keep car windows shut and the AC on recirculate ${homeward ? "on the way home" : "on the way in"}.`,
  closedWindows: " Closed windows keep most traffic smoke out of the cabin.",
  keepIndoors: (who) => `Keep ${who} indoors where you can, with windows shut.`,
  everyone: "everyone",
  fineOutdoors: (sensitive) =>
    `Fine for errands and time outdoors${sensitive ? ", keeping effort light for the most sensitive" : ""}.`,
  headline: (place, category, aqi, care) => {
    const extra = care ? `: extra care for ${care}` : "";
    return `${category} air in ${place} today (AQI ${String(aqi)})${extra}`;
  },
  shareLead: (place, category, aqi, source) =>
    `Air in ${place} today: ${category}, AQI ${String(aqi)}. Source: ${source}.`,
  noAnswer: (place, category, aqi) =>
    `I can't answer that question in detail right now, so here is today's general guidance. The air in ${place} is ${category} (AQI ${String(aqi)}).`,
  extraCare: (groups) => ` Take extra care for ${groups}.`,
  indoor: {
    getPurifier: {
      action: "Run an air purifier in the room you sleep in, with the door and windows shut.",
      why: "Nights are long and indoors is where most of the day's air is breathed.",
    },
    runPurifier: {
      action: "Keep the purifier on high in the bedroom, with doors and windows shut.",
      why: "A purifier can only keep up when outdoor air isn't flowing in.",
    },
    ventilate: {
      action: "Open the windows briefly only at the cleanest hour, then shut them.",
      why: "Homes still need fresh air for moisture and cooking fumes; timing it cuts what comes in.",
    },
    solidFuel: {
      action: "Cook by an open window or outdoors, and move to LPG if you can.",
      why: "Smoke from wood, coal, dung or kerosene is one of the biggest indoor sources of PM2.5.",
    },
    smoker: {
      action: "Smoke only outdoors, well away from doors and windows.",
      why: "Tobacco smoke adds fine particles indoors that a purifier struggles to clear.",
    },
    clean: {
      action: "Wet-mop floors and skip incense, mosquito coils and candles.",
      why: "Sweeping stirs settled dust back into the air, and smoke sources add fine particles.",
    },
  },
  travel: {
    transit: {
      action: "Take the metro or a bus for this week's commute.",
      why: "Shared transport puts far less exhaust into the air you and your neighbours breathe.",
    },
    carpool: {
      action: "Carpool with colleagues who live along your route.",
      why: "One car instead of three means less traffic smoke on the road you drive.",
    },
    remote: {
      action: "Ask for a work- or study-from-home day while the smog lasts.",
      why: "Every trip skipped is time out of traffic air and fuel not burned.",
    },
    combine: {
      action: "Combine errands into one trip, by metro, bus or e-rickshaw where you can.",
      why: "Fewer, shorter trips mean less time breathing roadside air and fewer engines running.",
    },
    noBurning: {
      action: "Never burn leaves or rubbish, and report open burning on CPCB's Sameer app.",
      why: "Open burning is a large local source of winter smog.",
    },
  },
};

export const FALLBACK_COPY: Record<Language, FallbackCopy> = { en: ENGLISH_COPY, ta: TAMIL_COPY };
