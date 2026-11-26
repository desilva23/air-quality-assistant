// Everything the plan is built from, computed once: today's index, how the day
// is forecast to go, who needs most care, and what each choice would change.
// The AI prompt and the built-in plan both start here.

import type { AirReport, OutlookHour } from "./air";
import { categoryForPm25, indianAqi, type AqiCategory, type AqiResult } from "./aqi";
import type { Language } from "../i18n/language";
import { sensitiveGroups, type Household, type PartOfDay, type SensitiveGroup } from "./household";
import { impactFacts, type ImpactFact } from "./impacts";
import { partAverages } from "./timing";

export interface PartForecast {
  average: number;
  category: AqiCategory;
}

/** Mean forecast PM2.5 and its band for each part of the coming day; null where not forecast. */
export function partForecasts(outlook: OutlookHour[]): Record<PartOfDay, PartForecast | null> {
  const averages = partAverages(outlook);
  const forecast = (part: PartOfDay): PartForecast | null => {
    const average = averages[part];
    return average === null
      ? null
      : { average: Math.round(average), category: categoryForPm25(average) };
  };
  return {
    morning: forecast("morning"),
    afternoon: forecast("afternoon"),
    evening: forecast("evening"),
  };
}

export interface Situation {
  aqi: AqiResult;
  parts: Record<PartOfDay, PartForecast | null>;
  sensitive: SensitiveGroup[];
  facts: ImpactFact[];
}

export function assessSituation(
  household: Household,
  report: AirReport,
  language: Language = "en",
): Situation {
  return {
    aqi: indianAqi(report.reading),
    parts: partForecasts(report.outlook),
    sensitive: sensitiveGroups(household),
    facts: impactFacts(household, report, language),
  };
}
