// Who lives in the home and how they spend the day. Advice is personal because
// it is built from this: a commuter and a family with toddlers in the same city
// get different plans.

import * as z from "../zod";

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
    distanceKm: z.number().check(z.gte(0), z.lte(MAX_COMMUTE_KM)),
    daysPerWeek: z.int().check(z.gte(0), z.lte(7)),
  }),
  activity: z.object({
    kind: z.enum(ACTIVITIES),
    partOfDay: z.enum(PARTS_OF_DAY),
    minutes: z.int().check(z.gte(0), z.lte(MAX_ACTIVITY_MINUTES)),
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

export type SensitiveGroup = keyof Household["members"];

const SENSITIVE_GROUPS: readonly SensitiveGroup[] = [
  "children",
  "seniors",
  "respiratory",
  "pregnant",
];

/** The people the advice must protect most, most vulnerable first. */
export function sensitiveGroups({ members }: Household): SensitiveGroup[] {
  return SENSITIVE_GROUPS.filter((group) => members[group]);
}

/** Modes where the traveller breathes street air directly. */
export function isOpenAirMode(mode: CommuteMode): boolean {
  return ["walk", "cycle", "two-wheeler", "auto", "bus"].includes(mode);
}

export type PrivateVehicle = "two-wheeler" | "auto" | "car";

/** Modes that burn fuel the traveller could choose not to burn. */
export function isPrivateVehicle(mode: CommuteMode): mode is PrivateVehicle {
  return mode === "two-wheeler" || mode === "auto" || mode === "car";
}
