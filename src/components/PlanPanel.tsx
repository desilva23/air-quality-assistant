"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { AiEnvelope, PlanItem, PlanReply } from "@/lib/ai/contracts";
import { CATEGORY_LABEL } from "@/lib/domain/aqi";
import { PART_LABEL, PARTS_OF_DAY, type PartOfDay } from "@/lib/domain/household";
import type { ImpactId } from "@/lib/domain/impacts";
import type { PartForecast } from "@/lib/domain/situation";
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
                  <span className="impact-label">Impact:</span> {impact}
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
  const [copied, setCopied] = useState<string | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied. Paste it into your family or society group.");
    } catch {
      setCopied("Copying isn't allowed here. Select the text above and copy it.");
    }
  }
  return (
    <div className="share">
      <h4>Share with your family or housing society</h4>
      <p className="share-text">{text}</p>
      <button type="button" className="button secondary" onClick={() => void copy()}>
        Copy message
      </button>
      <p role="status" className="status">
        {copied}
      </p>
    </div>
  );
}

/** Today's plan: the day hour by hour, the home, and lower-emission swaps, each with its impact. */
export const PlanPanel = memo(function PlanPanel({ envelope, parts }: PlanPanelProps) {
  const { plan, facts } = envelope.data;
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
                {PART_LABEL[part]}
              </h4>
              {forecast && (
                <p className="part-forecast">
                  {CATEGORY_LABEL[forecast.category]} air, PM2.5 around {forecast.average} µg/m³
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
            Cleaner air at home
          </h4>
          <ItemList items={plan.indoor} impacts={impacts} />
        </section>
        <section>
          <h4>
            <Icon name="swap" />
            Lower-emission swaps
          </h4>
          <ItemList items={plan.alternatives} impacts={impacts} />
        </section>
      </div>
      <ShareBox text={plan.shareText} />
    </article>
  );
});
