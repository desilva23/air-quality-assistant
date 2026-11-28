"use client";

import type { FallbackNotice } from "@/lib/ai/contracts";
import { useMessages } from "./i18n";

export interface SourceNoteProps {
  source: "ai" | "fallback";
  notice?: FallbackNotice;
}

/** Says whether content was written by the AI or is the built-in guidance, and why. */
export function SourceNote({ source, notice }: Readonly<SourceNoteProps>) {
  const { plan } = useMessages();
  let text = plan.builtIn;
  if (source === "ai") text = plan.fromAi;
  else if (notice) text = plan.notices[notice];
  return <p className={`source-note ${source}`}>{text}</p>;
}
