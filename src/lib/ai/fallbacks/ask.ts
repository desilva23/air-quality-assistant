// The built-in answer when the AI is off or fails. It doesn't try to read the
// question; it says plainly that this is general guidance for today.

import { CATEGORY_HEALTH, CATEGORY_LABEL } from "../../domain/aqi";
import { planItems, type Answer, type AskRequest } from "../contracts";
import { contextFor, planFrom } from "./plan";

export function answerFallback(request: AskRequest): Answer {
  const ctx = contextFor(request);
  const { aqi, sensitive } = ctx.situation;
  const care = sensitive.length ? ` Take extra care for ${sensitive.join(" and ")}.` : "";
  const tips = planItems(planFrom(ctx).plan)
    .slice(0, 3)
    .map((item) => item.action);
  return {
    answer: `I can't answer that question in detail right now, so here is today's general guidance. The air in ${request.place.name} is ${CATEGORY_LABEL[aqi.category]} (AQI ${String(aqi.value)}). ${CATEGORY_HEALTH[aqi.category]}${care}`,
    tips,
  };
}
