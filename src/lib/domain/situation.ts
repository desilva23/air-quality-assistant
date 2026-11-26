// Everything the plan is built from, computed once: today's index, how the day
// is forecast to go, who needs most care, and what each choice would change.
// The AI prompt and the built-in plan both start here.

import type { AirReport } from "./air";
import { categoryForPm25, indianAqi, type AqiCategory, type AqiResult } from "./aqi";
import { sensitiveGroups, type Household, type PartOfDay } from "./household";
import { impactFacts, type ImpactFact } from "./impacts";
import { partAverages } from "./timing";

interface PartForecast {
  average: number;
  category: AqiCategory;
}

export interface Situation {
  aqi: AqiResult;
  parts: Record<PartOfDay, PartForecast | null>;
  sensitive: string[];
  facts: ImpactFact[];
}

export function assessSituation(household: Household, report: AirReport): Situation {
  const averages = partAverages(report.outlook);
  const forecast = (part: PartOfDay): PartForecast | null => {
    const average = averages[part];
    return average === null
      ? null
      : { average: Math.round(average), category: categoryForPm25(average) };
  };
  return {
    aqi: indianAqi(report.reading),
    parts: {
      morning: forecast("morning"),
      afternoon: forecast("afternoon"),
      evening: forecast("evening"),
    },
    sensitive: sensitiveGroups(household),
    facts: impactFacts(household, report),
  };
}
