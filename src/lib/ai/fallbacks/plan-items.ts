// Indoor and travel items for the built-in plan. Each rule says when it
// applies; the first few that apply are used, most important first.

import { isUnhealthy } from "../../domain/aqi";
import { isPrivateVehicle } from "../../domain/household";
import type { PlanItem } from "../contracts";
import type { Ctx } from "./plan";

interface Rule {
  applies: (ctx: Ctx) => boolean;
  item: (ctx: Ctx) => PlanItem;
}

const unhealthyNow = ({ situation }: Ctx): boolean => isUnhealthy(situation.aqi.category);

const INDOOR_RULES: Rule[] = [
  {
    applies: (ctx) => !ctx.request.household.home.purifier,
    item: (ctx) => ({
      action: "Run an air purifier in the room you sleep in, with the door and windows shut.",
      why: "Nights are long and indoors is where most of the day's air is breathed.",
      impactId: ctx.cite("purifier"),
    }),
  },
  {
    applies: (ctx) => ctx.request.household.home.purifier,
    item: () => ({
      action: "Keep the purifier on high in the bedroom, with doors and windows shut.",
      why: "A purifier can only keep up when outdoor air isn't flowing in.",
      impactId: null,
    }),
  },
  {
    applies: (ctx) => ctx.cite("ventilate") !== null,
    item: (ctx) => ({
      action: "Open the windows briefly only at the cleanest hour, then shut them.",
      why: "Homes still need fresh air for moisture and cooking fumes; timing it cuts what comes in.",
      impactId: ctx.cite("ventilate"),
    }),
  },
  {
    applies: (ctx) => ctx.request.household.home.cooking === "solid",
    item: () => ({
      action: "Cook by an open window or outdoors, and move to LPG if you can.",
      why: "Smoke from wood, coal, dung or kerosene is one of the biggest indoor sources of PM2.5.",
      impactId: null,
    }),
  },
  {
    applies: (ctx) => ctx.request.household.home.smoker,
    item: () => ({
      action: "Smoke only outdoors, well away from doors and windows.",
      why: "Tobacco smoke adds fine particles indoors that a purifier struggles to clear.",
      impactId: null,
    }),
  },
  {
    applies: () => true,
    item: () => ({
      action: "Wet-mop floors and skip incense, mosquito coils and candles.",
      why: "Sweeping stirs settled dust back into the air, and smoke sources add fine particles.",
      impactId: null,
    }),
  },
];

const ALTERNATIVE_RULES: Rule[] = [
  {
    applies: (ctx) => ctx.cite("commute-switch") !== null,
    item: (ctx) => ({
      action: "Take the metro or a bus for this week's commute.",
      why: "Shared transport puts far less exhaust into the air you and your neighbours breathe.",
      impactId: ctx.cite("commute-switch"),
    }),
  },
  {
    applies: (ctx) => ctx.cite("carpool") !== null,
    item: (ctx) => ({
      action: "Carpool with colleagues who live along your route.",
      why: "One car instead of three means less traffic smoke on the road you drive.",
      impactId: ctx.cite("carpool"),
    }),
  },
  {
    applies: (ctx) => ctx.cite("remote-day") !== null && unhealthyNow(ctx),
    item: (ctx) => ({
      action: "Ask for a work- or study-from-home day while the smog lasts.",
      why: "Every trip skipped is time out of traffic air and fuel not burned.",
      impactId: ctx.cite("remote-day"),
    }),
  },
  {
    applies: (ctx) => !isPrivateVehicle(ctx.request.household.commute.mode),
    item: () => ({
      action: "Combine errands into one trip, by metro, bus or e-rickshaw where you can.",
      why: "Fewer, shorter trips mean less time breathing roadside air and fewer engines running.",
      impactId: null,
    }),
  },
  {
    applies: () => true,
    item: () => ({
      action: "Never burn leaves or rubbish, and report open burning on CPCB's Sameer app.",
      why: "Open burning is a large local source of winter smog.",
      impactId: null,
    }),
  },
];

function firstThatApply(rules: Rule[], ctx: Ctx, max: number): PlanItem[] {
  return rules
    .filter((rule) => rule.applies(ctx))
    .slice(0, max)
    .map((rule) => rule.item(ctx));
}

export const indoorItems = (ctx: Ctx): PlanItem[] => firstThatApply(INDOOR_RULES, ctx, 4);
export const alternativeItems = (ctx: Ctx): PlanItem[] => firstThatApply(ALTERNATIVE_RULES, ctx, 3);
