// Request and reply shapes for the AI features. The same schemas validate the
// request on the server, describe the JSON the model must return, re-check what
// it returned, and validate the reply again in the browser.

import type { z as zod } from "zod";
import { z } from "../zod";
import { AirReportSchema, PlaceSchema } from "../domain/air";
import { HouseholdSchema } from "../domain/household";
import { IMPACT_IDS, ImpactFactSchema, type ImpactId } from "../domain/impacts";

export const PlanRequestSchema = z.object({
  place: PlaceSchema,
  household: HouseholdSchema,
  report: AirReportSchema,
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

const text = (max: number) => z.string().trim().min(1).max(max);

function planSchemaFor(impactId: zod.ZodType<ImpactId | null>) {
  const item = z.object({ action: text(140), why: text(260), impactId });
  const items = (max: number) => z.array(item).min(1).max(max);
  return z.object({
    headline: text(160),
    routine: z.object({ morning: items(3), afternoon: items(3), evening: items(3) }),
    indoor: items(4),
    alternatives: items(3),
    /** A short message for a family or housing-society group. No personal details. */
    shareText: text(400),
  });
}

/** A plan as the app shows it: any computed impact may be cited. */
const PlanSchema = planSchemaFor(z.enum(IMPACT_IDS).nullable());

export type Plan = z.infer<typeof PlanSchema>;
export type PlanItem = Plan["indoor"][number];

/** What the model must return: it may cite only the impacts computed for this request. */
export function planSchemaCiting(ids: readonly ImpactId[]) {
  const [first, ...rest] = ids;
  return planSchemaFor(first === undefined ? z.null() : z.enum([first, ...rest]).nullable());
}

export function planItems(plan: Plan): PlanItem[] {
  const { morning, afternoon, evening } = plan.routine;
  return [...morning, ...afternoon, ...evening, ...plan.indoor, ...plan.alternatives];
}

/** Keeps only the first citation of each impact, in reading order, so no number shows twice. */
export function citeOnce(plan: Plan): Plan {
  const cited = new Set<ImpactId>();
  const once = (items: PlanItem[]): PlanItem[] =>
    items.map((item) => {
      if (!item.impactId) return item;
      if (cited.has(item.impactId)) return { ...item, impactId: null };
      cited.add(item.impactId);
      return item;
    });
  const { morning, afternoon, evening } = plan.routine;
  return {
    ...plan,
    routine: { morning: once(morning), afternoon: once(afternoon), evening: once(evening) },
    indoor: once(plan.indoor),
    alternatives: once(plan.alternatives),
  };
}

/** The plan with the facts it cites. Every cited id must have its fact. */
export const PlanReplySchema = z
  .object({ plan: PlanSchema, facts: z.array(ImpactFactSchema).max(IMPACT_IDS.length) })
  .refine(
    ({ plan, facts }) =>
      planItems(plan).every((item) => !item.impactId || facts.some((f) => f.id === item.impactId)),
    { error: "The plan cites an impact it doesn't include" },
  );

export type PlanReply = z.infer<typeof PlanReplySchema>;

export const MIN_QUESTION_LENGTH = 3;
export const MAX_QUESTION_LENGTH = 300;

export const AskRequestSchema = PlanRequestSchema.extend({
  question: z.string().trim().min(MIN_QUESTION_LENGTH).max(MAX_QUESTION_LENGTH),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;

export const AnswerSchema = z.object({ answer: text(800), tips: z.array(text(160)).max(3) });

export type Answer = z.infer<typeof AnswerSchema>;

/** What every AI endpoint returns, so the interface can say where content came from. */
export interface AiEnvelope<T> {
  source: "ai" | "fallback";
  data: T;
  notice?: string;
}

export function envelopeOf<T>(data: zod.ZodType<T>): zod.ZodType<AiEnvelope<T>> {
  return z.object({
    source: z.enum(["ai", "fallback"]),
    data,
    notice: z.string().max(200).optional(),
  });
}

export const PlanEnvelopeSchema = envelopeOf(PlanReplySchema);
export const AnswerEnvelopeSchema = envelopeOf(AnswerSchema);
