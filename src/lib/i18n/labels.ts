// Names for the app's fixed choices and categories, in each language. Used by
// the interface, the built-in guidance and the impact wording alike.

import type { AqiCategory } from "../domain/aqi";
import type {
  Activity,
  CommuteMode,
  CookingFuel,
  Mask,
  PartOfDay,
  SensitiveGroup,
} from "../domain/household";
import type { Language } from "./language";
import { TAMIL_LABELS } from "./labels.ta";

export interface Labels {
  part: Record<PartOfDay, string>;
  mode: Record<CommuteMode, string>;
  activity: Record<Activity, string>;
  /** The activity as a noun inside a sentence. */
  activityNoun: Record<Exclude<Activity, "none">, string>;
  mask: Record<Mask, string>;
  cooking: Record<CookingFuel, string>;
  category: Record<AqiCategory, string>;
  /** CPCB's published health impact for each category. */
  health: Record<AqiCategory, string>;
  sensitive: Record<SensitiveGroup, string>;
  /** Joins the last two items of a list: "a, b and c". */
  and: string;
}

const ENGLISH_LABELS: Labels = {
  part: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
  mode: {
    none: "I don't commute",
    walk: "Walk",
    cycle: "Cycle",
    "two-wheeler": "Scooter or motorbike",
    auto: "Auto-rickshaw",
    bus: "Bus",
    metro: "Metro or local train",
    car: "Car",
  },
  activity: {
    none: "None",
    walk: "Walk",
    run: "Run or jog",
    sport: "Sport or gym outdoors",
    "outdoor-play": "Children's outdoor play",
  },
  activityNoun: {
    walk: "walk",
    run: "run",
    sport: "outdoor sport",
    "outdoor-play": "children's outdoor play",
  },
  mask: { none: "No mask", cloth: "Cloth mask", surgical: "Surgical mask", n95: "N95 or FFP2" },
  cooking: {
    gas: "LPG or piped gas",
    electric: "Induction or electric",
    solid: "Wood, coal, dung or kerosene",
  },
  category: {
    good: "Good",
    satisfactory: "Satisfactory",
    moderate: "Moderate",
    poor: "Poor",
    "very-poor": "Very poor",
    severe: "Severe",
  },
  health: {
    good: "Minimal impact.",
    satisfactory: "Minor breathing discomfort for sensitive people.",
    moderate:
      "Breathing discomfort for people with asthma or other lung disease, heart disease, children and older adults.",
    poor: "Breathing discomfort for most people on prolonged exposure.",
    "very-poor": "Respiratory illness on prolonged exposure.",
    severe: "Affects healthy people and seriously affects those with existing diseases.",
  },
  sensitive: {
    children: "young children",
    seniors: "older adults",
    respiratory: "someone with asthma, COPD or a heart condition",
    pregnant: "a pregnant family member",
  },
  and: "and",
};

export const LABELS: Record<Language, Labels> = { en: ENGLISH_LABELS, ta: TAMIL_LABELS };

/** "a", "a and b", "a, b and c", in the given language. */
export function listPhrase(items: readonly string[], language: Language): string {
  const head = items.slice(0, -1);
  const last = items.at(-1) ?? "";
  return head.length ? `${head.join(", ")} ${LABELS[language].and} ${last}` : last;
}
