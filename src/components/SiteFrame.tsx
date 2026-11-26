export interface SiteHeaderProps {
  aiEnabled: boolean;
}

export function SiteHeader({ aiEnabled }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <p className="brand">Urban Air Quality Assistant</p>
      <p className={`ai-status ${aiEnabled ? "on" : "off"}`}>
        {aiEnabled ? "AI on (Groq)" : "AI off: built-in guidance"}
      </p>
    </header>
  );
}

/** The first thing on the page: what the assistant does, in one look. */
export function Hero() {
  return (
    <div className="hero">
      <h1>Plan a cleaner-air day for your household</h1>
      <p className="lede">
        Live air quality for any town in India, a plan for your family&apos;s day around the smog,
        and what each choice changes for your lungs, the air and your wallet.
      </p>
      <ul className="hero-points" aria-label="What you get">
        <li>Live CPCB station data</li>
        <li>A plan for who lives with you</li>
        <li>The impact of every choice</li>
      </ul>
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
