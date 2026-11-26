// The built-in answer when the AI is off or fails. It doesn't try to read the
// question; it says plainly that this is general guidance for today.

import { listPhrase } from "../../i18n/labels";
import { planItems, type Answer, type AskRequest } from "../contracts";
import { contextFor, planFrom } from "./plan";

export function answerFallback(request: AskRequest): Answer {
  const ctx = contextFor(request);
  const { aqi, sensitive } = ctx.situation;
  const { copy, labels } = ctx;
  const groups = sensitive.map((group) => labels.sensitive[group]);
  const care = groups.length ? copy.extraCare(listPhrase(groups, request.language)) : "";
  const lead = copy.noAnswer(request.place.name, labels.category[aqi.category], aqi.value);
  return {
    answer: `${lead} ${labels.health[aqi.category]}${care}`,
    tips: planItems(planFrom(ctx).plan)
      .slice(0, 3)
      .map((item) => item.action),
  };
}
