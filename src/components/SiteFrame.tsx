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
