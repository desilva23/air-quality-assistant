"use client";

import type { ReactNode } from "react";
import type { AqiCategory } from "@/lib/domain/aqi";
import { LANGUAGE_NAME, LANGUAGES, type Language } from "@/lib/i18n/language";
import { useLanguage, useMessages } from "./i18n";
import { Icon } from "./Icon";

export interface SiteHeaderProps {
  aiEnabled: boolean;
  onLanguage: (language: Language) => void;
}

/** English or Tamil; the current one is pressed. Names are written in their own script. */
function LanguageSwitch({ onLanguage }: Readonly<{ onLanguage: (language: Language) => void }>) {
  const current = useLanguage();
  const m = useMessages();
  return (
    <div className="language-switch" role="group" aria-label={m.language}>
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          aria-pressed={language === current}
          onClick={() => onLanguage(language)}
        >
          {LANGUAGE_NAME[language]}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader({ aiEnabled, onLanguage }: Readonly<SiteHeaderProps>) {
  const m = useMessages();
  return (
    <header className="site-header">
      <p className="brand">
        <span className="brand-mark">
          <Icon name="wind" />
        </span>
        {m.brand}
      </p>
      <div className="header-tools">
        <LanguageSwitch onLanguage={onLanguage} />
        <p className={`ai-status ${aiEnabled ? "on" : "off"}`}>{aiEnabled ? m.aiOn : m.aiOff}</p>
      </div>
    </header>
  );
}

export interface SkyBandProps {
  /** Today's air, which sets the band's colour; null until a reading arrives. */
  category: AqiCategory | null;
  children: ReactNode;
}

/** The opening band. Its colour is the sky over the chosen place: clear, hazy or smoky. */
export function SkyBand({ category, children }: Readonly<SkyBandProps>) {
  return <div className={`sky sky-${category ?? "unknown"}`}>{children}</div>;
}

export function Intro() {
  const m = useMessages();
  return (
    <div className="intro">
      <h1>{m.title}</h1>
      <p className="lede">{m.lede}</p>
    </div>
  );
}

export function SiteFooter() {
  const { footer } = useMessages();
  return (
    <footer className="site-footer">
      <p>
        {footer.data} <a href="https://openaq.org">OpenAQ</a> {footer.stations}{" "}
        <a href="https://open-meteo.com">Open-Meteo</a> {footer.model}
      </p>
      <p>{footer.medical}</p>
      <p>
        <a href="https://github.com/desilva23/air-quality-assistant">{footer.code}</a>
      </p>
    </footer>
  );
}
