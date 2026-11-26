import type { ReactNode } from "react";
import type { AqiCategory } from "@/lib/domain/aqi";
import { Icon } from "./Icon";

export interface SiteHeaderProps {
  aiEnabled: boolean;
}

export function SiteHeader({ aiEnabled }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <p className="brand">
        <span className="brand-mark">
          <Icon name="wind" />
        </span>
        Urban Air Quality Assistant
      </p>
      <p className={`ai-status ${aiEnabled ? "on" : "off"}`}>
        {aiEnabled ? "AI on (Groq)" : "AI off: built-in guidance"}
      </p>
    </header>
  );
}

export interface SkyBandProps {
  /** Today's air, which sets the band's colour; null until a reading arrives. */
  category: AqiCategory | null;
  children: ReactNode;
}

/** The opening band. Its colour is the sky over the chosen place: clear, hazy or smoky. */
export function SkyBand({ category, children }: SkyBandProps) {
  return <div className={`sky sky-${category ?? "unknown"}`}>{children}</div>;
}

export function Intro() {
  return (
    <div className="intro">
      <h1>Plan a cleaner-air day for your household</h1>
      <p className="lede">
        See the air outside right now, anywhere in India. Then get a plan for your family&apos;s
        day: when to go out, how to travel and what to do at home, with what each choice saves.
      </p>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Air data: <a href="https://openaq.org">OpenAQ</a> station measurements (including CPCB
        stations) and the <a href="https://open-meteo.com">Open-Meteo</a> air quality model
        (Copernicus CAMS, CC BY 4.0). Places: Open-Meteo geocoding.
      </p>
      <p>General guidance, not medical advice. See a doctor for breathlessness or chest pain.</p>
      <p>
        <a href="https://github.com/desilva23/air-quality-assistant">Source code on GitHub</a>
      </p>
    </footer>
  );
}
