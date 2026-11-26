// Indoor and travel items for the built-in plan. Each rule says when it
// applies; the first few that apply are used, most important first.

import { isUnhealthy } from "../../domain/aqi";
import { isPrivateVehicle } from "../../domain/household";
import type { ImpactId } from "../../domain/impacts";
import type { PlanItem } from "../contracts";
import type { IndoorAdvice, TravelAdvice } from "./copy";
import type { Ctx } from "./plan";

interface Rule<K> {
  advice: K;
  applies: (ctx: Ctx) => boolean;
  /** The impact this advice cites, when it applies today. */
  impact?: ImpactId;
}

const unhealthyNow = ({ situation }: Ctx): boolean => isUnhealthy(situation.aqi.category);
const hasImpact = (id: ImpactId) => (ctx: Ctx) => ctx.cite(id) !== null;

const INDOOR_RULES: Rule<IndoorAdvice>[] = [
  {
    advice: "getPurifier",
    applies: (ctx) => !ctx.request.household.home.purifier,
    impact: "purifier",
  },
  { advice: "runPurifier", applies: (ctx) => ctx.request.household.home.purifier },
  { advice: "ventilate", applies: hasImpact("ventilate"), impact: "ventilate" },
  { advice: "solidFuel", applies: (ctx) => ctx.request.household.home.cooking === "solid" },
  { advice: "smoker", applies: (ctx) => ctx.request.household.home.smoker },
  { advice: "clean", applies: () => true },
];

const TRAVEL_RULES: Rule<TravelAdvice>[] = [
  { advice: "transit", applies: hasImpact("commute-switch"), impact: "commute-switch" },
  { advice: "carpool", applies: hasImpact("carpool"), impact: "carpool" },
  {
    advice: "remote",
    applies: (ctx) => hasImpact("remote-day")(ctx) && unhealthyNow(ctx),
    impact: "remote-day",
  },
  { advice: "combine", applies: (ctx) => !isPrivateVehicle(ctx.request.household.commute.mode) },
  { advice: "noBurning", applies: () => true },
];

function firstThatApply<K extends string>(
  rules: Rule<K>[],
  ctx: Ctx,
  copy: Record<K, { action: string; why: string }>,
  max: number,
): PlanItem[] {
  return rules
    .filter((rule) => rule.applies(ctx))
    .slice(0, max)
    .map((rule) => ({
      ...copy[rule.advice],
      impactId: rule.impact ? ctx.cite(rule.impact) : null,
    }));
}

export const indoorItems = (ctx: Ctx): PlanItem[] =>
  firstThatApply(INDOOR_RULES, ctx, ctx.copy.indoor, 4);
export const alternativeItems = (ctx: Ctx): PlanItem[] =>
  firstThatApply(TRAVEL_RULES, ctx, ctx.copy.travel, 3);
