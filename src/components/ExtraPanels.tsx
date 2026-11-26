"use client";

import type { AirReport, Place } from "@/lib/domain/air";
import type { Household } from "@/lib/domain/household";
import { ChoicesPanel } from "./ChoicesPanel";
import { CommutePanel } from "./CommutePanel";
import { StationsPanel } from "./StationsPanel";

export interface ExtraPanelsProps {
  place: Place;
  report: AirReport;
  household: Household;
}

/**
 * Below the plan: stations around the place, a what-if for today's dose, and
 * every way to make the commute. Loaded only once live air has arrived.
 */
export function ExtraPanels({ place, report, household }: ExtraPanelsProps) {
  const { mask, home } = household;
  return (
    <>
      <StationsPanel place={place} />
      <ChoicesPanel
        key={`${String(report.reading.pm25)}|${mask}|${String(home.purifier)}`}
        pm25={report.reading.pm25}
        household={household}
      />
      <CommutePanel household={household} />
    </>
  );
}
