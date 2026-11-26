// The app speaks English and Tamil. Everything a person reads, including the
// AI's plan and the computed impacts, comes in the language they chose.

import { z } from "../zod";

export const LANGUAGES = ["en", "ta"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LanguageSchema = z.enum(LANGUAGES);

/** Each language's name, written in that language, for the switch. */
export const LANGUAGE_NAME: Record<Language, string> = { en: "English", ta: "தமிழ்" };

/** Locale tags for times: Indian English and Tamil (India). */
export const LOCALE: Record<Language, string> = { en: "en-IN", ta: "ta-IN" };
