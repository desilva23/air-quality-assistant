"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import type { PlanRequest } from "@/lib/ai/contracts";
import { requestPlan, useApiCall } from "@/lib/client/api";
import { partForecasts } from "@/lib/domain/situation";

// Below the first screen, so its code loads only when a plan arrives.
const PlanPanel = lazy(() => import("./PlanPanel").then((m) => ({ default: m.PlanPanel })));

export interface PlanSectionProps {
  /** Null until a place's live air has loaded. */
  request: PlanRequest | null;
}

/** Builds today's plan on request, and says when it no longer matches the answers. */
export function PlanSection({ request }: PlanSectionProps) {
  const plan = useApiCall(requestPlan);
  const [plannedFor, setPlannedFor] = useState<PlanRequest | null>(null);
  const parts = useMemo(() => partForecasts(plannedFor?.report.outlook ?? []), [plannedFor]);

  function build(current: PlanRequest) {
    setPlannedFor(current);
    void plan.run(current);
  }

  return (
    <section aria-labelledby="plan-heading" className="card span-all plan-card">
      <h2 id="plan-heading">Today&apos;s plan</h2>
      {!request && (
        <p className="muted">Choose a place first: the plan is built from its live air.</p>
      )}
      <button
        type="button"
        className="button primary"
        onClick={request ? () => build(request) : undefined}
        disabled={!request || plan.loading}
      >
        {plan.loading ? "Building your plan…" : "Build today's plan"}
      </button>
      {plan.error && (
        <p role="alert" className="error">
          {plan.error}
        </p>
      )}
      {plan.data && plannedFor !== request && (
        <p className="note">
          Your place or answers changed since this plan was made. Build it again to update it.
        </p>
      )}
      {plan.data && (
        <Suspense fallback={<p>Loading the plan…</p>}>
          <PlanPanel envelope={plan.data} parts={parts} />
        </Suspense>
      )}
    </section>
  );
}
