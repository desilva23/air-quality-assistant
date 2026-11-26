// Ready-made households for a quick try, and for reviewers checking that
// different households get different plans. The air is always live.

import type { Place } from "./domain/air";
import type { Household } from "./domain/household";

export interface Sample {
  id: string;
  label: string;
  summary: string;
  place: Place;
  household: Household;
}

export const SAMPLES: readonly Sample[] = [
  {
    id: "delhi-family",
    label: "Delhi family",
    summary: "Two young children who play outside in the evening; parent drives 15 km to work.",
    place: { name: "New Delhi", region: "Delhi", latitude: 28.61, longitude: 77.21 },
    household: {
      members: { children: true, seniors: false, respiratory: false, pregnant: false },
      commute: { mode: "car", distanceKm: 15, daysPerWeek: 5 },
      activity: { kind: "outdoor-play", partOfDay: "evening", minutes: 60 },
      home: { purifier: false, cooking: "gas", smoker: false },
      mask: "none",
    },
  },
  {
    id: "mumbai-commuter",
    label: "Mumbai commuter",
    summary: "Rides a scooter 12 km each way six days a week and runs before work.",
    place: { name: "Mumbai", region: "Maharashtra", latitude: 19.08, longitude: 72.88 },
    household: {
      members: { children: false, seniors: false, respiratory: false, pregnant: false },
      commute: { mode: "two-wheeler", distanceKm: 12, daysPerWeek: 6 },
      activity: { kind: "run", partOfDay: "morning", minutes: 40 },
      home: { purifier: false, cooking: "gas", smoker: false },
      mask: "cloth",
    },
  },
  {
    id: "kolkata-seniors",
    label: "Kolkata seniors",
    summary: "A retired couple, one with asthma, who take a morning walk and own a purifier.",
    place: { name: "Kolkata", region: "West Bengal", latitude: 22.57, longitude: 88.36 },
    household: {
      members: { children: false, seniors: true, respiratory: true, pregnant: false },
      commute: { mode: "none", distanceKm: 0, daysPerWeek: 0 },
      activity: { kind: "walk", partOfDay: "morning", minutes: 45 },
      home: { purifier: true, cooking: "gas", smoker: false },
      mask: "surgical",
    },
  },
];
