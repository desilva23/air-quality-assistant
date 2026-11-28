"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import type { PlanRequest } from "@/lib/ai/contracts";
import { requestPlan, useApiCall } from "@/lib/client/api";
import { partForecasts } from "@/lib/domain/situation";
import { useMessages } from "./i18n";

// Below the first screen, so its code loads only when a plan arrives.
const PlanPanel = lazy(() => import("./PlanPanel").then((m) => ({ default: m.PlanPanel })));

export interface PlanSectionProps {
  /** Null until a place's live air has loaded. */
  request: PlanRequest | null;
}

/** Builds today's plan on request, and says when it no longer matches the answers. */
export function PlanSection({ request }: Readonly<PlanSectionProps>) {
  const m = useMessages();
  const plan = useApiCall(requestPlan);
  const [plannedFor, setPlannedFor] = useState<PlanRequest | null>(null);
  const parts = useMemo(() => partForecasts(plannedFor?.report.outlook ?? []), [plannedFor]);

  function build(current: PlanRequest) {
    setPlannedFor(current);
    void plan.run(current);
  }

  return (
    <section aria-labelledby="plan-heading" className="card span-all plan-card">
      <h2 id="plan-heading">{m.plan.heading}</h2>
      {!request && <p className="muted">{m.plan.choosePlace}</p>}
      <button
        type="button"
        className="button primary"
        onClick={request ? () => build(request) : undefined}
        disabled={!request || plan.loading}
      >
        {plan.loading ? m.plan.building : m.plan.build}
      </button>
      {plan.error && (
        <p role="alert" className="error">
          {m.errors[plan.error]}
        </p>
      )}
      {plan.data && plannedFor !== request && <p className="note">{m.plan.changed}</p>}
      {plan.data && (
        <Suspense fallback={<p>{m.plan.loading}</p>}>
          <PlanPanel envelope={plan.data} parts={parts} />
        </Suspense>
      )}
    </section>
  );
}
