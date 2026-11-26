"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo } from "react";
import type { PlanRequest } from "@/lib/ai/contracts";
import { fetchAir, useApiCall } from "@/lib/client/api";
import { useHousehold, usePlace } from "@/lib/client/saved";
import type { Sample } from "@/lib/samples";
import { AirSection } from "./AirSection";
import { HouseholdForm } from "./HouseholdForm";
import { PlaceSearch } from "./PlaceSearch";
import { PlanSection } from "./PlanSection";
import { SampleProfiles } from "./SampleProfiles";
import { Hero, SiteFooter, SiteHeader } from "./SiteFrame";

// Shown only once live air has loaded, so its code loads then too.
const AskPanel = lazy(() => import("./AskPanel").then((m) => ({ default: m.AskPanel })));

export interface AssistantAppProps {
  aiEnabled: boolean;
}

/** The whole assistant: place, live air, household, today's plan and questions. */
export function AssistantApp({ aiEnabled }: AssistantAppProps) {
  const [household, setHousehold] = useHousehold();
  const [place, setPlace] = usePlace();
  const air = useApiCall(fetchAir);

  // Live air is fetched whenever the place changes, including a place saved last time.
  const loadAir = air.run;
  useEffect(() => {
    if (place) void loadAir(place);
  }, [place, loadAir]);

  const report = air.status === "done" ? air.data : undefined;
  const request = useMemo<PlanRequest | null>(
    () => (place && report ? { place, household, report } : null),
    [place, household, report],
  );

  const pickSample = useCallback(
    (sample: Sample) => {
      setHousehold(sample.household);
      setPlace(sample.place);
    },
    [setHousehold, setPlace],
  );

  return (
    <>
      <SiteHeader aiEnabled={aiEnabled} />
      <main id="main" tabIndex={-1} className="container">
        <Hero />
        <section aria-labelledby="where-heading" className="card">
          <h2 id="where-heading">1. Where are you?</h2>
          <PlaceSearch onSelect={setPlace} />
          <SampleProfiles onPick={pickSample} />
        </section>
        {place && (
          <AirSection
            place={place}
            status={air.status}
            report={report}
            error={air.error}
            onRetry={() => void loadAir(place)}
          />
        )}
        <section aria-labelledby="household-heading" className="card">
          <h2 id="household-heading">3. Your household</h2>
          <HouseholdForm value={household} onChange={setHousehold} />
        </section>
        <PlanSection request={request} />
        {request && (
          <section aria-labelledby="ask-heading" className="card">
            <h2 id="ask-heading">5. Ask about today</h2>
            <Suspense fallback={<p>Loading…</p>}>
              <AskPanel context={request} />
            </Suspense>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
