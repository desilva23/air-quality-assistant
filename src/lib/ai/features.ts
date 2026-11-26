import "server-only";
import { assessSituation } from "../domain/situation";
import {
  AnswerSchema,
  citeOnce,
  planSchemaCiting,
  type Answer,
  type AskRequest,
  type PlanReply,
  type PlanRequest,
} from "./contracts";
import { generateStructured } from "./llm";
import { ASK_SYSTEM, askPrompt, PLAN_SYSTEM, planPrompt } from "./prompts";

/** Today's plan, written by the model around the impacts the app computed. */
export async function createPlan(request: PlanRequest): Promise<PlanReply> {
  const situation = assessSituation(request.household, request.report);
  const plan = await generateStructured({
    name: "household_plan",
    schema: planSchemaCiting(situation.facts.map((fact) => fact.id)),
    system: PLAN_SYSTEM,
    prompt: planPrompt(request, situation),
    model: "smart",
    temperature: 0.4,
    timeoutMs: 30_000,
  });
  return { plan: citeOnce(plan), facts: situation.facts };
}

/** A direct answer to the user's question about today. */
export function answerQuestion(request: AskRequest): Promise<Answer> {
  const situation = assessSituation(request.household, request.report);
  return generateStructured({
    name: "answer",
    schema: AnswerSchema,
    system: ASK_SYSTEM,
    prompt: askPrompt(request, situation),
    model: "lite",
    temperature: 0.3,
    timeoutMs: 20_000,
  });
}
