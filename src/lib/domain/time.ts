// Every user is in India, so times are shown and planned in IST whatever the
// device's own time zone, in the reader's language.

import { LOCALE, type Language } from "../i18n/language";

const IST = "Asia/Kolkata";

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: IST,
});

const clockFormats: Record<Language, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat(LOCALE.en, { hour: "numeric", minute: "2-digit", timeZone: IST }),
  ta: new Intl.DateTimeFormat(LOCALE.ta, { hour: "numeric", minute: "2-digit", timeZone: IST }),
};

const hourLabelFormats: Record<Language, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat(LOCALE.en, { hour: "numeric", timeZone: IST }),
  ta: new Intl.DateTimeFormat(LOCALE.ta, { hour: "numeric", timeZone: IST }),
};

/** Hour of the day in IST, 0–23. */
export function istHour(iso: string): number {
  return Number(hourFormat.format(new Date(iso)));
}

/** "2:00 pm" in IST, or its Tamil form. */
export function formatClock(iso: string, language: Language = "en"): string {
  return clockFormats[language].format(new Date(iso));
}

/** "2 pm" in IST, or its Tamil form, for chart axes. */
export function formatHour(iso: string, language: Language = "en"): string {
  return hourLabelFormats[language].format(new Date(iso));
}
