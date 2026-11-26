// Puts each computed impact into words, in English or Tamil. Every number in
// these sentences comes from impacts.ts; only the phrasing lives here.

import type { Language } from "../i18n/language";
import { LABELS, listPhrase } from "../i18n/labels";
import { formatKg, formatRupees } from "./emissions";
import type { Mask, PrivateVehicle } from "./household";
import type { ImpactData } from "./impacts";
import { formatClock } from "./time";

const MASK_PHRASE: Record<Language, Record<Mask, string>> = {
  en: { none: "no mask", cloth: "a cloth mask", surgical: "a surgical mask", n95: "an N95" },
  ta: {
    none: "முகக்கவசம் இல்லாமல் இருப்பதை விட",
    cloth: "துணி முகக்கவசத்தை விட",
    surgical: "அறுவைச் சிகிச்சை முகக்கவசத்தை விட",
    n95: "N95-ஐ விட",
  },
};

const VEHICLE_PHRASE: Record<Language, Record<PrivateVehicle, string>> = {
  en: { "two-wheeler": "your scooter or motorbike", auto: "your auto-rickshaw", car: "your car" },
  ta: {
    "two-wheeler": "ஸ்கூட்டர் அல்லது பைக்குக்குப் பதில்",
    auto: "ஆட்டோவுக்குப் பதில்",
    car: "காருக்குப் பதில்",
  },
};

const PURIFIER_TAIL: Record<Language, { owned: string; missing: string }> = {
  en: { owned: " with your purifier running", missing: ", and more with a purifier running" },
  ta: {
    owned: ", உங்கள் சுத்திகரிப்பான் இயங்கும்போது",
    missing: "; சுத்திகரிப்பான் இயங்கினால் இன்னும் அதிகம்",
  },
};

/** How a purifier changes the indoor-activity sentence. */
function purifierTail(purifier: boolean, language: Language): string {
  return purifier ? PURIFIER_TAIL[language].owned : PURIFIER_TAIL[language].missing;
}

type CommuteSwitch = Extract<ImpactData, { id: "commute-switch" }>;

/** What switching saves, as phrases: CO₂, then petrol for petrol vehicles. */
function commuteSavings(data: CommuteSwitch, language: Language): string[] {
  const en = language === "en";
  const saved = [
    en ? `about ${formatKg(data.kg)} kg of CO₂` : `சுமார் ${formatKg(data.kg)} கி.கி. CO₂`,
  ];
  if (data.rupees !== null) {
    saved.push(
      en ? `${formatRupees(data.rupees)} of petrol` : `${formatRupees(data.rupees)} பெட்ரோல்`,
    );
  }
  return saved;
}

function english(data: ImpactData): string {
  const clock = (iso: string) => formatClock(iso, "en");
  const noun = (activity: keyof typeof LABELS.en.activityNoun) => LABELS.en.activityNoun[activity];
  switch (data.id) {
    case "shift-activity":
      return `Moving your ${String(data.minutes)}-minute ${noun(data.activity)} from ${clock(data.from)} to ${clock(data.to)} cuts the PM2.5 you breathe during it by about ${String(data.cut)}% (forecast ${String(data.best)} vs ${String(data.usual)} µg/m³).`;
    case "move-indoors":
      return `Doing the ${noun(data.activity)} indoors instead cuts that dose by about ${String(data.cut)}%${purifierTail(data.purifier, "en")}.`;
    case "mask":
      return `A well-fitted N95 instead of ${MASK_PHRASE.en[data.current]} cuts what you breathe in during your ${String(data.minutes)} minutes outdoors by about ${String(data.cut)}%.`;
    case "purifier":
      return `A purifier sized for the bedroom, with windows shut, could keep indoor PM2.5 near ${String(data.withPurifier)} instead of about ${String(data.withoutPurifier)} µg/m³ at today's outdoor level.`;
    case "ventilate":
      return `Air the home for 10–15 minutes around ${clock(data.at)}, the cleanest hour forecast (${String(data.best)} µg/m³, against a peak of ${String(data.peak)} at ${clock(data.peakAt)}).`;
    case "commute-switch":
      return `Taking the metro or a bus instead of ${VEHICLE_PHRASE.en[data.vehicle]} for ${String(data.km)} km each way saves ${listPhrase(commuteSavings(data, "en"), "en")} a week.`;
    case "carpool":
      return `Sharing the car with two others cuts your share of its CO₂ by about ${formatKg(data.kg)} kg a week, and your petrol bill by about ${formatRupees(data.rupees)} if you split the cost.`;
    case "remote-day":
      return `One day a week at home instead of commuting saves ${listPhrase(remoteSavings(data, "en"), "en")}.`;
  }
}

function tamil(data: ImpactData): string {
  const clock = (iso: string) => formatClock(iso, "ta");
  const noun = (activity: keyof typeof LABELS.ta.activityNoun) => LABELS.ta.activityNoun[activity];
  switch (data.id) {
    case "shift-activity":
      return `உங்கள் ${String(data.minutes)} நிமிட ${noun(data.activity)} நேரத்தை ${clock(data.from)} என்பதிலிருந்து ${clock(data.to)} ஆக மாற்றினால், அப்போது நீங்கள் சுவாசிக்கும் PM2.5 சுமார் ${String(data.cut)}% குறையும் (முன்னறிவிப்பு ${String(data.best)} vs ${String(data.usual)} µg/m³).`;
    case "move-indoors":
      return `${noun(data.activity)}: வீட்டுக்குள் செய்தால் அந்த அளவு சுமார் ${String(data.cut)}% குறையும்${purifierTail(data.purifier, "ta")}.`;
    case "mask":
      return `${MASK_PHRASE.ta[data.current]}, நன்கு பொருந்தும் N95 அணிந்தால் வெளியே இருக்கும் ${String(data.minutes)} நிமிடங்களில் நீங்கள் சுவாசிப்பது சுமார் ${String(data.cut)}% குறையும்.`;
    case "purifier":
      return `படுக்கையறைக்கு ஏற்ற சுத்திகரிப்பான், ஜன்னல்கள் மூடிய நிலையில், இன்றைய வெளிக்காற்று அளவில் வீட்டு PM2.5-ஐச் சுமார் ${String(data.withoutPurifier)} µg/m³ என்பதற்குப் பதில் ${String(data.withPurifier)} அருகே வைத்திருக்கும்.`;
    case "ventilate":
      return `முன்னறிவிப்பில் மிகத் தூய்மையான நேரமான ${clock(data.at)} அளவில் 10–15 நிமிடம் வீட்டைக் காற்றோட்டம் செய்யுங்கள் (${String(data.best)} µg/m³; உச்சம் ${clock(data.peakAt)} அளவில் ${String(data.peak)}).`;
    case "commute-switch":
      return `ஒவ்வொரு வழியும் ${String(data.km)} கி.மீ. பயணத்துக்கு ${VEHICLE_PHRASE.ta[data.vehicle]} மெட்ரோ அல்லது பேருந்து பயன்படுத்தினால் வாரத்துக்கு ${listPhrase(commuteSavings(data, "ta"), "ta")} மிச்சமாகும்.`;
    case "carpool":
      return `இன்னும் இருவருடன் காரைப் பகிர்ந்தால், அதன் CO₂-இல் உங்கள் பங்கு வாரத்துக்குச் சுமார் ${formatKg(data.kg)} கி.கி. குறையும்; செலவைப் பிரித்துக்கொண்டால் பெட்ரோல் செலவு சுமார் ${formatRupees(data.rupees)} குறையும்.`;
    case "remote-day":
      return `வாரத்தில் ஒரு நாள் பயணிக்காமல் வீட்டிலிருந்தால் ${listPhrase(remoteSavings(data, "ta"), "ta")} மிச்சமாகும்.`;
  }
}

type RemoteDay = Extract<ImpactData, { id: "remote-day" }>;

/** What a day at home saves, as phrases: time on the road, then CO₂ and petrol when there are any. */
function remoteSavings(data: RemoteDay, language: Language): string[] {
  const en = language === "en";
  const saved = [
    en
      ? `${String(data.minutes)} minutes on the road`
      : `${String(data.minutes)} நிமிடச் சாலைப் பயணம்`,
  ];
  if (data.kg !== null)
    saved.push(
      en ? `about ${formatKg(data.kg)} kg of CO₂` : `சுமார் ${formatKg(data.kg)} கி.கி. CO₂`,
    );
  if (data.rupees !== null)
    saved.push(
      en ? `${formatRupees(data.rupees)} of petrol` : `${formatRupees(data.rupees)} பெட்ரோல்`,
    );
  return saved;
}

/** One sentence stating an impact and its number, in `language`. */
export function describeImpact(data: ImpactData, language: Language): string {
  return language === "ta" ? tamil(data) : english(data);
}
