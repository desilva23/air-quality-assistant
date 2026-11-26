import { PlanReplySchema, PlanRequestSchema } from "@/lib/ai/contracts";
import { createPlan } from "@/lib/ai/features";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { aiRoute } from "@/lib/server/ai-route";

export const POST = aiRoute({
  name: "plan",
  input: PlanRequestSchema,
  output: PlanReplySchema,
  run: createPlan,
  fallback: planFallback,
});
