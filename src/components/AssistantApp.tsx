"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Place } from "@/lib/domain/air";
import type { PlanRequest } from "@/lib/ai/contracts";
import { fetchAir, useApiCall } from "@/lib/client/api";
import { useRevealWhenReady } from "@/lib/client/reveal";
import { useHousehold, usePlace } from "@/lib/client/saved";
import { indianAqi } from "@/lib/domain/aqi";
import type { Sample } from "@/lib/samples";
import { AirSection } from "./AirSection";
import { AskSection } from "./AskSection";
import { HouseholdForm } from "./HouseholdForm";
import { PlaceSearch } from "./PlaceSearch";
import { PlanSection } from "./PlanSection";
import { SampleProfiles } from "./SampleProfiles";
import { Intro, SiteFooter, SiteHeader, SkyBand } from "./SiteFrame";
import { SkyReading } from "./SkyReading";

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
  const aqi = useMemo(() => (report ? indianAqi(report.reading) : null), [report]);
  const request = useMemo<PlanRequest | null>(
    () => (place && report ? { place, household, report } : null),
    [place, household, report],
  );

  const { targetRef: readingRef, ask: askToReveal } = useRevealWhenReady(aqi !== null);

  const choosePlace = useCallback(
    (next: Place) => {
      askToReveal();
      setPlace(next);
    },
    [askToReveal, setPlace],
  );

  const pickSample = useCallback(
    (sample: Sample) => {
      setHousehold(sample.household);
      choosePlace(sample.place);
    },
    [setHousehold, choosePlace],
  );

  return (
    <>
      <SkyBand category={aqi?.category ?? null}>
        <SiteHeader aiEnabled={aiEnabled} />
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
              <h2 id="where-heading">Where are you?</h2>
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
              <h2 id="household-heading">Your household</h2>
              <HouseholdForm value={household} onChange={setHousehold} />
            </section>
            <PlanSection request={request} />
            {request && <AskSection context={request} />}
          </div>
        </main>
      </SkyBand>
      <SiteFooter />
    </>
  );
}
