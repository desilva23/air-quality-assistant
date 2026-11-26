import { AnswerSchema, AskRequestSchema } from "@/lib/ai/contracts";
import { answerQuestion } from "@/lib/ai/features";
import { answerFallback } from "@/lib/ai/fallbacks/ask";
import { aiRoute } from "@/lib/server/ai-route";

export const POST = aiRoute({
  name: "ask",
  input: AskRequestSchema,
  output: AnswerSchema,
  run: answerQuestion,
  fallback: answerFallback,
});
