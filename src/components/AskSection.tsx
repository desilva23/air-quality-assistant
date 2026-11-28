"use client";

import { lazy, Suspense } from "react";
import type { PlanRequest } from "@/lib/ai/contracts";
import { useMessages } from "./i18n";

// Shown only once live air has loaded, so its code loads then too.
const AskPanel = lazy(() => import("./AskPanel").then((m) => ({ default: m.AskPanel })));

export interface AskSectionProps {
  context: PlanRequest;
}

export function AskSection({ context }: Readonly<AskSectionProps>) {
  const { ask } = useMessages();
  return (
    <section aria-labelledby="ask-heading" className="card span-all">
      <h2 id="ask-heading">{ask.heading}</h2>
      <Suspense fallback={<p>{ask.loading}</p>}>
        <AskPanel context={context} />
      </Suspense>
    </section>
  );
}
