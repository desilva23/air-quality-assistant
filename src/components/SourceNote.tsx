"use client";

import type { FallbackNotice } from "@/lib/ai/contracts";
import { useMessages } from "./i18n";

export interface SourceNoteProps {
  source: "ai" | "fallback";
  notice?: FallbackNotice;
}

/** Says whether content was written by the AI or is the built-in guidance, and why. */
export function SourceNote({ source, notice }: SourceNoteProps) {
  const { plan } = useMessages();
  const text = source === "ai" ? plan.fromAi : notice ? plan.notices[notice] : plan.builtIn;
  return <p className={`source-note ${source}`}>{text}</p>;
}
