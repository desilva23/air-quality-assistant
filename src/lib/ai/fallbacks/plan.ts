// The built-in plan, used when the AI is off or fails. It follows the same
// contract as the AI's plan and cites the same computed impacts, from fixed
// wording chosen by today's air and the household's answers.

import { CATEGORY_LABEL, isUnhealthy, type AqiCategory } from "../../domain/aqi";
import { ACTIVITY_NOUN, isOpenAirMode, type PartOfDay } from "../../domain/household";
import type { ImpactId } from "../../domain/impacts";
import { assessSituation, type Situation } from "../../domain/situation";
import type { Plan, PlanItem, PlanReply, PlanRequest } from "../contracts";
import { alternativeItems, indoorItems } from "./plan-items";

export interface Ctx {
  request: PlanRequest;
  situation: Situation;
  /** The cited id when that impact applies today, otherwise null. */
  cite: (id: ImpactId) => ImpactId | null;
}

function categoryFor({ situation }: Ctx, part: PartOfDay): AqiCategory {
  return situation.parts[part]?.category ?? situation.aqi.category;
}

function forecastWhy(ctx: Ctx, part: PartOfDay): string {
  const forecast = ctx.situation.parts[part];
  return forecast
    ? `PM2.5 this ${part} is forecast to average ${String(forecast.average)} µg/m³ (${CATEGORY_LABEL[forecast.category]}).`
    : `Air right now is ${CATEGORY_LABEL[ctx.situation.aqi.category]}.`;
}

function activityItem(ctx: Ctx, part: PartOfDay): PlanItem | null {
  const { activity } = ctx.request.household;
  if (activity.kind === "none" || activity.partOfDay !== part) return null;
  const name = ACTIVITY_NOUN[activity.kind];
  if (!isUnhealthy(categoryFor(ctx, part))) {
    return {
      action: `Go ahead with the ${name}, at an easy pace.`,
      why: forecastWhy(ctx, part),
      impactId: null,
    };
  }
  const shift = ctx.cite("shift-activity");
  return {
    action: shift
      ? `Move the ${name} to the cleaner hour below, or do it indoors.`
      : `Do the ${name} indoors today.`,
    why: `${forecastWhy(ctx, part)} Harder breathing outdoors pulls more particles deep into the lungs.`,
    impactId: shift ?? ctx.cite("move-indoors"),
  };
}

function commuteItem(ctx: Ctx, part: PartOfDay): PlanItem | null {
  const { mode } = ctx.request.household.commute;
  if (mode === "none" || part === "afternoon" || !isUnhealthy(categoryFor(ctx, part))) return null;
  if (isOpenAirMode(mode)) {
    return {
      action: `Wear a well-fitted N95 for the ${part === "morning" ? "ride in" : "ride home"}.`,
      why: `${forecastWhy(ctx, part)} You breathe street air directly on this trip.`,
      impactId: ctx.cite("mask"),
    };
  }
  return {
    action: `Keep car windows shut and the AC on recirculate ${part === "morning" ? "on the way in" : "on the way home"}.`,
    why: `${forecastWhy(ctx, part)} Closed windows keep most traffic smoke out of the cabin.`,
    impactId: null,
  };
}

function generalItem(ctx: Ctx, part: PartOfDay): PlanItem {
  const unhealthy = isUnhealthy(categoryFor(ctx, part));
  const sensitive = ctx.situation.sensitive.length > 0;
  const action = unhealthy
    ? `Keep ${sensitive ? ctx.situation.sensitive.join(" and ") : "everyone"} indoors where you can, with windows shut.`
    : `Fine for errands and time outdoors${sensitive ? ", keeping effort light for the most sensitive" : ""}.`;
  return { action, why: forecastWhy(ctx, part), impactId: null };
}

function routineFor(ctx: Ctx, part: PartOfDay): PlanItem[] {
  const items = [activityItem(ctx, part), commuteItem(ctx, part)].filter((item) => item !== null);
  return items.length ? items : [generalItem(ctx, part)];
}

function headline({ request, situation }: Ctx): string {
  const { aqi } = situation;
  const [mostSensitive] = situation.sensitive;
  const care =
    mostSensitive && isUnhealthy(aqi.category) ? `: extra care for ${mostSensitive}` : "";
  return `${CATEGORY_LABEL[aqi.category]} air in ${request.place.name} today (AQI ${String(aqi.value)})${care}`;
}

function shareText(ctx: Ctx, plan: Omit<Plan, "shareText">): string {
  const { aqi } = ctx.situation;
  const tips = [...plan.routine.morning, ...plan.indoor, ...plan.alternatives]
    .slice(0, 3)
    .map((item) => `• ${item.action}`);
  return [
    `Air in ${ctx.request.place.name} today: ${CATEGORY_LABEL[aqi.category]}, AQI ${String(aqi.value)}. Source: ${ctx.request.report.reading.source}.`,
    ...tips,
  ]
    .join("\n")
    .slice(0, 400);
}

export function contextFor(request: PlanRequest): Ctx {
  const situation = assessSituation(request.household, request.report);
  const ids = new Set(situation.facts.map((fact) => fact.id));
  return { request, situation, cite: (id) => (ids.has(id) ? id : null) };
}

export function planFrom(ctx: Ctx): PlanReply {
  const body = {
    headline: headline(ctx),
    routine: {
      morning: routineFor(ctx, "morning"),
      afternoon: routineFor(ctx, "afternoon"),
      evening: routineFor(ctx, "evening"),
    },
    indoor: indoorItems(ctx),
    alternatives: alternativeItems(ctx),
  };
  return { plan: { ...body, shareText: shareText(ctx, body) }, facts: ctx.situation.facts };
}

/** The built-in plan for this household and today's air. */
export function planFallback(request: PlanRequest): PlanReply {
  return planFrom(contextFor(request));
}
