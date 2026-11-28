"use client";

import { lazy, Suspense } from "react";
import { AirSection } from "./AirSection";
import { AskSection } from "./AskSection";
import { HouseholdForm } from "./HouseholdForm";
import { LanguageProvider } from "./i18n";
import { MESSAGES } from "@/lib/i18n/messages";
import { PlaceSearch } from "./PlaceSearch";
import { PlanSection } from "./PlanSection";
import { SampleProfiles } from "./SampleProfiles";
import { Intro, SiteFooter, SiteHeader, SkyBand } from "./SiteFrame";
import { SkyReading } from "./SkyReading";
import { useAssistant } from "./use-assistant";

// Below the plan, so their code (the map included) loads only once there is air to show.
const ExtraPanels = lazy(() => import("./ExtraPanels").then((m) => ({ default: m.ExtraPanels })));

export interface AssistantAppProps {
  aiEnabled: boolean;
}

/** The whole assistant: place, live air, household, today's plan and questions. */
export function AssistantApp({ aiEnabled }: Readonly<AssistantAppProps>) {
  const {
    place,
    report,
    aqi,
    request,
    language,
    setLanguage,
    readingRef,
    air,
    loadAir,
    household,
    setHousehold,
    choosePlace,
    pickSample,
  } = useAssistant();
  const m = MESSAGES[language];

  return (
    <LanguageProvider language={language}>
      <div lang={language} className="app">
        <a href="#main" className="skip-link">
          {m.skip}
        </a>
        <SkyBand category={aqi?.category ?? null}>
          <SiteHeader aiEnabled={aiEnabled} onLanguage={setLanguage} />
          <main id="main" tabIndex={-1}>
            <div className="sky-inner">
              <Intro />
              {place && (
                <SkyReading
                  ref={readingRef}
                  place={place}
                  aqi={aqi}
                  reading={report?.reading ?? null}
                />
              )}
              <section aria-labelledby="where-heading" className="where">
                <h2 id="where-heading">{m.where.heading}</h2>
                <PlaceSearch onSelect={choosePlace} />
                <SampleProfiles onPick={pickSample} />
              </section>
            </div>
            <div className="dashboard">
              {place && (
                <AirSection
                  place={place}
                  status={air.status}
                  report={report}
                  aqi={aqi}
                  error={air.error}
                  onRetry={() => void loadAir(place)}
                />
              )}
              <section aria-labelledby="household-heading" className="card household-card">
                <h2 id="household-heading">{m.household.heading}</h2>
                <HouseholdForm value={household} onChange={setHousehold} />
              </section>
              <PlanSection request={request} />
              {place && report && (
                <Suspense fallback={null}>
                  <ExtraPanels place={place} report={report} household={household} />
                </Suspense>
              )}
              {request && <AskSection context={request} />}
            </div>
          </main>
        </SkyBand>
        <SiteFooter />
      </div>
    </LanguageProvider>
  );
}
