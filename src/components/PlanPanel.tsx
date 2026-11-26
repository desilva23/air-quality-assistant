"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { AiEnvelope, PlanItem, PlanReply } from "@/lib/ai/contracts";
import { PARTS_OF_DAY, type PartOfDay } from "@/lib/domain/household";
import type { ImpactId } from "@/lib/domain/impacts";
import type { PartForecast } from "@/lib/domain/situation";
import { useLabels, useMessages } from "./i18n";
import { Icon, type IconName } from "./Icon";
import { SourceNote } from "./SourceNote";

export interface PlanPanelProps {
  envelope: AiEnvelope<PlanReply>;
  /** The forecast for each part of the day the plan was built for. */
  parts: Record<PartOfDay, PartForecast | null>;
}

interface ItemListProps {
  items: PlanItem[];
  impacts: ReadonlyMap<ImpactId, string>;
}

const PART_ICON: Record<PartOfDay, IconName> = {
  morning: "sunrise",
  afternoon: "sun",
  evening: "moon",
};

const ItemList = memo(function ItemList({ items, impacts }: ItemListProps) {
  const { plan } = useMessages();
  return (
    <ul className="plan-items">
      {items.map((item) => {
        const impact = item.impactId && impacts.get(item.impactId);
        return (
          <li key={`${item.action}|${item.why}`}>
            <p className="action">{item.action}</p>
            <p className="why">{item.why}</p>
            {impact && (
              <p className="impact">
                <Icon name="leaf" />
                <span>
                  <span className="impact-label">{plan.impact}</span> {impact}
                </span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
});

function ShareBox({ text }: { text: string }) {
  const { plan } = useMessages();
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }
  return (
    <div className="share">
      <h4>{plan.share}</h4>
      <p className="share-text">{text}</p>
      <button type="button" className="button secondary" onClick={() => void copy()}>
        {plan.copy}
      </button>
      <p role="status" className="status">
        {copied && (copied === "done" ? plan.copied : plan.copyFailed)}
      </p>
    </div>
  );
}

/** Today's plan: the day hour by hour, the home, and lower-emission swaps, each with its impact. */
export const PlanPanel = memo(function PlanPanel({ envelope, parts }: PlanPanelProps) {
  const { plan, facts } = envelope.data;
  const m = useMessages();
  const labels = useLabels();
  const impacts = useMemo(() => new Map(facts.map((fact) => [fact.id, fact.text])), [facts]);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, [plan]);

  return (
    <article className="plan">
      <h3 ref={heading} tabIndex={-1}>
        {plan.headline}
      </h3>
      <SourceNote source={envelope.source} notice={envelope.notice} />
      <div className="routine">
        {PARTS_OF_DAY.map((part) => {
          const forecast = parts[part];
          return (
            <section key={part} className={`part part-${forecast?.category ?? "unknown"}`}>
              <h4>
                <Icon name={PART_ICON[part]} />
                {labels.part[part]}
              </h4>
              {forecast && (
                <p className="part-forecast">
                  {m.plan.partForecast(labels.category[forecast.category], forecast.average)}
                </p>
              )}
              <ItemList items={plan.routine[part]} impacts={impacts} />
            </section>
          );
        })}
      </div>
      <div className="plan-columns">
        <section>
          <h4>
            <Icon name="home" />
            {m.plan.home}
          </h4>
          <ItemList items={plan.indoor} impacts={impacts} />
        </section>
        <section>
          <h4>
            <Icon name="swap" />
            {m.plan.swaps}
          </h4>
          <ItemList items={plan.alternatives} impacts={impacts} />
        </section>
      </div>
      <ShareBox text={plan.shareText} />
    </article>
  );
});
