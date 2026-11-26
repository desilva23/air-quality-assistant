// Everything the interface says, in English. messages.ta.ts holds the Tamil;
// TypeScript makes sure it has every message this file has.

import type { AirNote } from "../domain/air";
import { STATION_MAX_AGE_HOURS, STATION_RADIUS_KM } from "../domain/air";
import type { ApiErrorCode } from "../api-errors";
import type { FallbackNotice } from "../ai/contracts";
import type { LocationProblem } from "../client/geolocation";
import type { Language } from "./language";
import { TAMIL_MESSAGES } from "./messages.ta";

const ENGLISH_MESSAGES = {
  skip: "Skip to content",
  brand: "Urban Air Quality Assistant",
  aiOn: "AI on (Groq)",
  aiOff: "AI off: built-in guidance",
  language: "Language",
  title: "Plan a cleaner-air day for your household",
  lede: "See the air outside right now, anywhere in India. Then get a plan for your family's day: when to go out, how to travel and what to do at home, with what each choice saves.",
  where: {
    heading: "Where are you?",
    town: "Town or city",
    placeholder: "e.g. Chennai, Noida, Pune",
    search: "Search",
    searching: "Searching…",
    useLocation: "Use my location",
    finding: "Finding you…",
    noMatch: "No town in India matched that name.",
    matches: "Matching places",
    samples: "Or try an example household (the air data is still live):",
    yourLocation: "Your location",
    location: {
      unsupported: "This browser can't share your location. Search for your town instead.",
      denied: "Your location wasn't shared. Search for your town instead.",
      outside:
        "That location looks outside India, which is all this assistant covers. Search instead.",
    } satisfies Record<LocationProblem, string>,
  },
  sky: {
    rightNow: (place: string) => `${place} right now`,
    waiting: "Reading the air…",
    measured: (station: string, km: number, time: string) =>
      `Measured at ${station}, ${String(km)} km away, at ${time} IST`,
    modelled: (time: string) => `Model estimate for this spot at ${time} IST`,
    aStation: "a monitoring station",
    scale: (pollutant: string) =>
      `Indicative AQI on India's national scale (0–500), set by ${pollutant}.`,
  },
  air: {
    heading: (place: string) => `Air in ${place} now`,
    loading: "Fetching live air data…",
    retry: "Try again",
    who: (times: number) => `PM2.5 is ${String(times)}× the WHO 24-hour guideline (15 µg/m³).`,
    withinWho: "PM2.5 is within the WHO 24-hour guideline (15 µg/m³).",
    source: "Source",
    where: "Where",
    measured: "Measured",
    forTime: "For",
    away: (station: string, km: number) => `${station}, ${String(km)} km away`,
    station: "Monitoring station",
    modelSpot: "Model estimate for this spot",
    cigarettes: (count: number) =>
      `If the air stayed like this all day, breathing it would do roughly the harm of smoking ${String(count)} cigarettes (Berkeley Earth's rule of thumb: 22 µg/m³ of PM2.5 for a day ≈ one cigarette).`,
    notes: {
      "stations-off":
        "Station readings aren't set up on this server, so this is the CAMS model's estimate for the spot.",
      "stations-down":
        "The station network didn't respond, so this is the CAMS model's estimate for the spot.",
      "no-fresh-station": `No monitoring station within ${String(STATION_RADIUS_KM)} km reported in the last ${String(STATION_MAX_AGE_HOURS)} hours, so this is the CAMS model's estimate for the spot.`,
    } satisfies Record<AirNote, string>,
  },
  chart: {
    caption: "PM2.5 forecast, next 24 hours",
    cleanest: (hour: string) => `Cleanest waking hour: ${hour}`,
    summary: (hours: number, low: number, high: number) =>
      `Forecast PM2.5 for the next ${String(hours)} hours ranges from ${String(low)} to ${String(high)} µg/m³.`,
    limit: "India's 24-hour limit",
    table: "Show the hourly values as a table",
    time: "Time (IST)",
    category: "Category",
    none: "No hourly forecast is available for this place right now.",
  },
  household: {
    heading: "Your household",
    members: "Who lives with you?",
    member: {
      children: "Children under 12",
      seniors: "Adults over 60",
      respiratory: "Someone with asthma, COPD or a heart condition",
      pregnant: "Someone who is pregnant",
    },
    commute: "Daily commute",
    travel: "How you usually travel",
    distance: "Distance each way",
    km: "km",
    days: "Days a week",
    routine: "Outdoor routine",
    activity: "Main outdoor activity",
    partOfDay: "Usually in the",
    duration: "For how long",
    minutes: "minutes",
    home: "Home and habits",
    purifier: "We have an air purifier",
    smoker: "Someone smokes at home",
    cooking: "Cooking fuel",
    mask: "Mask you usually wear outside",
    saved:
      "Saved in this browser only. It is sent to the server only when you ask for a plan or an answer, and it is never logged.",
  },
  plan: {
    heading: "Today's plan",
    choosePlace: "Choose a place first: the plan is built from its live air.",
    build: "Build today's plan",
    building: "Building your plan…",
    changed: "Your place or answers changed since this plan was made. Build it again to update it.",
    loading: "Loading the plan…",
    fromAi:
      "Written by AI (Groq) from the live data and your answers. Numbers are computed by the app.",
    notices: {
      "ai-off": "AI isn't switched on for this server, so this is the built-in guidance.",
      "ai-failed": "The AI service didn't answer, so this is the built-in guidance.",
    } satisfies Record<FallbackNotice, string>,
    builtIn: "Built-in guidance.",
    home: "Cleaner air at home",
    swaps: "Lower-emission swaps",
    impact: "Impact:",
    partForecast: (category: string, average: number) =>
      `${category} air, PM2.5 around ${String(average)} µg/m³`,
    share: "Share with your family or housing society",
    copy: "Copy message",
    copied: "Copied. Paste it into your family or society group.",
    copyFailed: "Copying isn't allowed here. Select the text above and copy it.",
  },
  ask: {
    heading: "Ask about today",
    question: "Your question",
    try: "Try:",
    examples: [
      "Can my kids play outside this evening?",
      "When should I open the windows today?",
      "Is it safe to go for a run tomorrow morning?",
    ],
    ask: "Ask",
    thinking: "Thinking…",
    loading: "Loading…",
  },
  footer: {
    data: "Air data:",
    stations: "station measurements (including CPCB stations) and the",
    model: "air quality model (Copernicus CAMS, CC BY 4.0). Places: Open-Meteo geocoding.",
    medical: "General guidance, not medical advice. See a doctor for breathlessness or chest pain.",
    code: "Source code on GitHub",
  },
  failure: {
    title: "Something went wrong",
    body: "The assistant hit a problem showing this page. Your saved answers are still here.",
    retry: "Try again",
  },
  errors: {
    CROSS_SITE: "This request has to come from the app itself.",
    UNSUPPORTED_MEDIA_TYPE: "The app sent something the server can't read. Reload and try again.",
    TOO_LARGE: "That request is too long. Shorten your question and try again.",
    INVALID_INPUT: "Some details are missing or out of range. Check them and try again.",
    RATE_LIMITED: "Too many requests in a short time. Wait a minute and try again.",
    DATA_UNAVAILABLE: "Live air data couldn't be fetched just now. Try again in a minute.",
    INTERNAL: "Something went wrong on our side. Try again.",
    RESPONSE_INVALID: "The server sent an answer we couldn't trust. Try again.",
    TIMEOUT: "The server took too long to answer. Try again.",
    CANCELLED: "The request was cancelled.",
    NETWORK: "Couldn't reach the server. Check your connection and try again.",
  } satisfies Record<ApiErrorCode, string>,
};

export type Messages = typeof ENGLISH_MESSAGES;

export const MESSAGES: Record<Language, Messages> = { en: ENGLISH_MESSAGES, ta: TAMIL_MESSAGES };
