// The built-in plan, used when the AI is off or fails. It follows the same
// contract as the AI's plan and cites the same computed impacts, worded from
// fixed copy in the reader's language and chosen by today's air and the
// household's answers.

import { isUnhealthy, type AqiCategory } from "../../domain/aqi";
import { isOpenAirMode, type PartOfDay } from "../../domain/household";
import type { ImpactId } from "../../domain/impacts";
import { assessSituation, type Situation } from "../../domain/situation";
import { LABELS, listPhrase, type Labels } from "../../i18n/labels";
import {
  SHARE_TEXT_MAX,
  type Plan,
  type PlanItem,
  type PlanReply,
  type PlanRequest,
} from "../contracts";
import { FALLBACK_COPY, type FallbackCopy } from "./copy";
import { alternativeItems, indoorItems } from "./plan-items";

export interface Ctx {
  request: PlanRequest;
  situation: Situation;
  copy: FallbackCopy;
  labels: Labels;
  /** The cited id when that impact applies today, otherwise null. */
  cite: (id: ImpactId) => ImpactId | null;
}

function categoryFor({ situation }: Ctx, part: PartOfDay): AqiCategory {
  return situation.parts[part]?.category ?? situation.aqi.category;
}

function forecastWhy(ctx: Ctx, part: PartOfDay): string {
  const forecast = ctx.situation.parts[part];
  const { category, part: partName } = ctx.labels;
  return forecast
    ? ctx.copy.forecastWhy(partName[part], forecast.average, category[forecast.category])
    : ctx.copy.airNow(category[ctx.situation.aqi.category]);
}

function activityItem(ctx: Ctx, part: PartOfDay): PlanItem | null {
  const { activity } = ctx.request.household;
  if (activity.kind === "none" || activity.partOfDay !== part) return null;
  const name = ctx.labels.activityNoun[activity.kind];
  if (!isUnhealthy(categoryFor(ctx, part))) {
    return { action: ctx.copy.goAhead(name), why: forecastWhy(ctx, part), impactId: null };
  }
  const shift = ctx.cite("shift-activity");
  return {
    action: shift ? ctx.copy.moveToCleaner(name) : ctx.copy.doIndoors(name),
    why: forecastWhy(ctx, part) + ctx.copy.deeperBreathing,
    impactId: shift ?? ctx.cite("move-indoors"),
  };
}

function commuteItem(ctx: Ctx, part: PartOfDay): PlanItem | null {
  const { mode } = ctx.request.household.commute;
  if (mode === "none" || part === "afternoon" || !isUnhealthy(categoryFor(ctx, part))) return null;
  const homeward = part === "evening";
  if (isOpenAirMode(mode)) {
    return {
      action: ctx.copy.maskRide(homeward),
      why: forecastWhy(ctx, part) + ctx.copy.streetAir,
      impactId: ctx.cite("mask"),
    };
  }
  return {
    action: ctx.copy.carWindows(homeward),
    why: forecastWhy(ctx, part) + ctx.copy.closedWindows,
    impactId: null,
  };
}

function sensitiveNames({ situation, labels }: Ctx): string[] {
  return situation.sensitive.map((group) => labels.sensitive[group]);
}

function generalItem(ctx: Ctx, part: PartOfDay): PlanItem {
  const names = sensitiveNames(ctx);
  const who = names.length ? listPhrase(names, ctx.request.language) : ctx.copy.everyone;
  const action = isUnhealthy(categoryFor(ctx, part))
    ? ctx.copy.keepIndoors(who)
    : ctx.copy.fineOutdoors(names.length > 0);
  return { action, why: forecastWhy(ctx, part), impactId: null };
}

function routineFor(ctx: Ctx, part: PartOfDay): PlanItem[] {
  const items = [activityItem(ctx, part), commuteItem(ctx, part)].filter((item) => item !== null);
  return items.length ? items : [generalItem(ctx, part)];
}

function headline(ctx: Ctx): string {
  const { aqi } = ctx.situation;
  const [mostSensitive] = sensitiveNames(ctx);
  const care = mostSensitive && isUnhealthy(aqi.category) ? mostSensitive : null;
  return ctx.copy.headline(
    ctx.request.place.name,
    ctx.labels.category[aqi.category],
    aqi.value,
    care,
  );
}

function shareText(ctx: Ctx, plan: Omit<Plan, "shareText">): string {
  const { aqi } = ctx.situation;
  const { request } = ctx;
  const lead = ctx.copy.shareLead(
    request.place.name,
    ctx.labels.category[aqi.category],
    aqi.value,
    request.report.reading.source,
  );
  const tips = [...plan.routine.morning, ...plan.indoor, ...plan.alternatives]
    .slice(0, 3)
    .map((item) => `• ${item.action}`);
  return [lead, ...tips].join("\n").slice(0, SHARE_TEXT_MAX);
}

export function contextFor(request: PlanRequest): Ctx {
  const situation = assessSituation(request.household, request.report, request.language);
  const ids = new Set(situation.facts.map((fact) => fact.id));
  return {
    request,
    situation,
    copy: FALLBACK_COPY[request.language],
    labels: LABELS[request.language],
    cite: (id) => (ids.has(id) ? id : null),
  };
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

/** The built-in plan for this household and today's air, in the request's language. */
export function planFallback(request: PlanRequest): PlanReply {
  return planFrom(contextFor(request));
}
