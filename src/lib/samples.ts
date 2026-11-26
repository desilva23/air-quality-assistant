// Ready-made households for a quick try, and for reviewers checking that
// different households get different plans. The air is always live.

import type { Place } from "./domain/air";
import type { Household } from "./domain/household";
import type { Language } from "./i18n/language";

export interface Sample {
  id: string;
  text: Record<Language, { label: string; summary: string }>;
  place: Place;
  household: Household;
}

const nobody = { children: false, seniors: false, respiratory: false, pregnant: false };

export const SAMPLES: readonly Sample[] = [
  {
    id: "chennai-family",
    text: {
      en: {
        label: "Chennai family",
        summary: "A grandparent with a heart condition and a child who cycles 4 km to school.",
      },
      ta: {
        label: "சென்னைக் குடும்பம்",
        summary: "இதய நோய் உள்ள தாத்தா அல்லது பாட்டி; பள்ளிக்கு 4 கி.மீ. சைக்கிளில் செல்லும் குழந்தை.",
      },
    },
    place: { name: "Chennai", region: "Tamil Nadu", latitude: 13.08, longitude: 80.27 },
    household: {
      members: { children: true, seniors: true, respiratory: true, pregnant: false },
      commute: { mode: "cycle", distanceKm: 4, daysPerWeek: 5 },
      activity: { kind: "walk", partOfDay: "morning", minutes: 30 },
      home: { purifier: false, cooking: "gas", smoker: false },
      mask: "none",
    },
  },
  {
    id: "delhi-family",
    text: {
      en: {
        label: "Delhi family",
        summary: "Two young children who play outside in the evening; parent drives 15 km to work.",
      },
      ta: {
        label: "தில்லிக் குடும்பம்",
        summary:
          "மாலையில் வெளியே விளையாடும் இரண்டு சிறு குழந்தைகள்; பெற்றோர் 15 கி.மீ. கார் ஓட்டி வேலைக்குச் செல்கிறார்.",
      },
    },
    place: { name: "New Delhi", region: "Delhi", latitude: 28.61, longitude: 77.21 },
    household: {
      members: { ...nobody, children: true },
      commute: { mode: "car", distanceKm: 15, daysPerWeek: 5 },
      activity: { kind: "outdoor-play", partOfDay: "evening", minutes: 60 },
      home: { purifier: false, cooking: "gas", smoker: false },
      mask: "none",
    },
  },
  {
    id: "mumbai-commuter",
    text: {
      en: {
        label: "Mumbai commuter",
        summary: "Rides a scooter 12 km each way six days a week and runs before work.",
      },
      ta: {
        label: "மும்பைப் பயணி",
        summary: "வாரம் ஆறு நாள் ஒவ்வொரு வழியும் 12 கி.மீ. ஸ்கூட்டரில் பயணம்; வேலைக்கு முன் ஓடுகிறார்.",
      },
    },
    place: { name: "Mumbai", region: "Maharashtra", latitude: 19.08, longitude: 72.88 },
    household: {
      members: nobody,
      commute: { mode: "two-wheeler", distanceKm: 12, daysPerWeek: 6 },
      activity: { kind: "run", partOfDay: "morning", minutes: 40 },
      home: { purifier: false, cooking: "gas", smoker: false },
      mask: "cloth",
    },
  },
  {
    id: "kolkata-seniors",
    text: {
      en: {
        label: "Kolkata seniors",
        summary: "A retired couple, one with asthma, who take a morning walk and own a purifier.",
      },
      ta: {
        label: "கொல்கத்தா மூத்தோர்",
        summary: "ஓய்வு பெற்ற தம்பதி; ஒருவருக்கு ஆஸ்துமா; காலை நடைப்பயிற்சி; சுத்திகரிப்பான் உண்டு.",
      },
    },
    place: { name: "Kolkata", region: "West Bengal", latitude: 22.57, longitude: 88.36 },
    household: {
      members: { ...nobody, seniors: true, respiratory: true },
      commute: { mode: "none", distanceKm: 0, daysPerWeek: 0 },
      activity: { kind: "walk", partOfDay: "morning", minutes: 45 },
      home: { purifier: true, cooking: "gas", smoker: false },
      mask: "surgical",
    },
  },
];
