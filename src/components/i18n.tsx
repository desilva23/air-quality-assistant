"use client";

import { createContext, use, type ReactNode } from "react";
import { LABELS, type Labels } from "@/lib/i18n/labels";
import type { Language } from "@/lib/i18n/language";
import { MESSAGES, type Messages } from "@/lib/i18n/messages";

const LanguageContext = createContext<Language>("en");

export interface LanguageProviderProps {
  language: Language;
  children: ReactNode;
}

/** Makes the reader's language available to every component below it. */
export function LanguageProvider({ language, children }: LanguageProviderProps) {
  return <LanguageContext value={language}>{children}</LanguageContext>;
}

export function useLanguage(): Language {
  return use(LanguageContext);
}

/** What the interface says, in the reader's language. */
export function useMessages(): Messages {
  return MESSAGES[useLanguage()];
}

/** Names for choices and categories, in the reader's language. */
export function useLabels(): Labels {
  return LABELS[useLanguage()];
}
