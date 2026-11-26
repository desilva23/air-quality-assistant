"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { PlanRequest } from "@/lib/ai/contracts";
import { fetchAir, useApiCall } from "@/lib/client/api";
import { useRevealWhenReady } from "@/lib/client/reveal";
import { useHousehold, usePlace, useSavedLanguage } from "@/lib/client/saved";
import type { Place } from "@/lib/domain/air";
import { indianAqi } from "@/lib/domain/aqi";
import type { Sample } from "@/lib/samples";

/**
 * The assistant's state: the saved place, household and language, the live air
 * for the place, and the request a plan or question is built from.
 */
export function useAssistant() {
  const [household, setHousehold] = useHousehold();
  const [place, setPlace] = usePlace();
  const [language, setLanguage] = useSavedLanguage();
  const air = useApiCall(fetchAir);

  // Live air is fetched whenever the place changes, including a place saved last time.
  const loadAir = air.run;
  useEffect(() => {
    if (place) void loadAir(place);
  }, [place, loadAir]);

  const report = air.status === "done" ? air.data : undefined;
  const aqi = useMemo(() => (report ? indianAqi(report.reading) : null), [report]);
  const request = useMemo<PlanRequest | null>(
    () => (place && report ? { place, household, report, language } : null),
    [place, household, report, language],
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

  return {
    ...{ household, setHousehold, place, language, setLanguage },
    ...{ air, loadAir, report, aqi, request, readingRef, choosePlace, pickSample },
  };
}
