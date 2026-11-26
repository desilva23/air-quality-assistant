// Who lives in the home and how they spend the day. Advice is personal because
// it is built from this: a commuter and a family with toddlers in the same city
// get different plans.

import { z } from "../zod";

export const PARTS_OF_DAY = ["morning", "afternoon", "evening"] as const;
export const COMMUTE_MODES = [
  "none",
  "walk",
  "cycle",
  "two-wheeler",
  "auto",
  "bus",
  "metro",
  "car",
] as const;
export const ACTIVITIES = ["none", "walk", "run", "sport", "outdoor-play"] as const;
export const MASKS = ["none", "cloth", "surgical", "n95"] as const;
export const COOKING_FUELS = ["gas", "electric", "solid"] as const;

export type PartOfDay = (typeof PARTS_OF_DAY)[number];
export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type Activity = (typeof ACTIVITIES)[number];
export type Mask = (typeof MASKS)[number];
export type CookingFuel = (typeof COOKING_FUELS)[number];

export const MAX_COMMUTE_KM = 80;
export const MAX_ACTIVITY_MINUTES = 240;

export const HouseholdSchema = z.object({
  members: z.object({
    children: z.boolean(),
    seniors: z.boolean(),
    respiratory: z.boolean(),
    pregnant: z.boolean(),
  }),
  commute: z.object({
    mode: z.enum(COMMUTE_MODES),
    /** One way. */
    distanceKm: z.number().min(0).max(MAX_COMMUTE_KM),
    daysPerWeek: z.int().min(0).max(7),
  }),
  activity: z.object({
    kind: z.enum(ACTIVITIES),
    partOfDay: z.enum(PARTS_OF_DAY),
    minutes: z.int().min(0).max(MAX_ACTIVITY_MINUTES),
  }),
  home: z.object({
    purifier: z.boolean(),
    cooking: z.enum(COOKING_FUELS),
    smoker: z.boolean(),
  }),
  mask: z.enum(MASKS),
});

export type Household = z.infer<typeof HouseholdSchema>;

export const DEFAULT_HOUSEHOLD: Household = {
  members: { children: false, seniors: false, respiratory: false, pregnant: false },
  commute: { mode: "none", distanceKm: 0, daysPerWeek: 0 },
  activity: { kind: "walk", partOfDay: "morning", minutes: 30 },
  home: { purifier: false, cooking: "gas", smoker: false },
  mask: "none",
};

export const PART_LABEL: Record<PartOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const MODE_LABEL: Record<CommuteMode, string> = {
  none: "I don't commute",
  walk: "Walk",
  cycle: "Cycle",
  "two-wheeler": "Scooter or motorbike",
  auto: "Auto-rickshaw",
  bus: "Bus",
  metro: "Metro or local train",
  car: "Car",
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  none: "None",
  walk: "Walk",
  run: "Run or jog",
  sport: "Sport or gym outdoors",
  "outdoor-play": "Children's outdoor play",
};

/** The activity as a noun inside a sentence: "move the run to 2 pm". */
export const ACTIVITY_NOUN: Record<Exclude<Activity, "none">, string> = {
  walk: "walk",
  run: "run",
  sport: "outdoor sport",
  "outdoor-play": "children's outdoor play",
};

export const MASK_LABEL: Record<Mask, string> = {
  none: "No mask",
  cloth: "Cloth mask",
  surgical: "Surgical mask",
  n95: "N95 or FFP2",
};

export const COOKING_LABEL: Record<CookingFuel, string> = {
  gas: "LPG or piped gas",
  electric: "Induction or electric",
  solid: "Wood, coal, dung or kerosene",
};

/** Plain words for the people the advice must protect most. */
export function sensitiveGroups({ members }: Household): string[] {
  return [
    members.children && "young children",
    members.seniors && "older adults",
    members.respiratory && "someone with asthma, COPD or a heart condition",
    members.pregnant && "a pregnant family member",
  ].filter((group) => typeof group === "string");
}

/** Modes where the traveller breathes street air directly. */
export function isOpenAirMode(mode: CommuteMode): boolean {
  return ["walk", "cycle", "two-wheeler", "auto", "bus"].includes(mode);
}

/** Modes that burn fuel the traveller could choose not to burn. */
export function isPrivateVehicle(mode: CommuteMode): boolean {
  return ["two-wheeler", "auto", "car"].includes(mode);
}
