"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { AiEnvelope, PlanItem, PlanReply } from "@/lib/ai/contracts";
import { PART_LABEL, PARTS_OF_DAY } from "@/lib/domain/household";
import type { ImpactId } from "@/lib/domain/impacts";
import { SourceNote } from "./SourceNote";

export interface PlanPanelProps {
  envelope: AiEnvelope<PlanReply>;
}

interface ItemListProps {
  items: PlanItem[];
  impacts: ReadonlyMap<ImpactId, string>;
}

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
                <span className="impact-label">Impact:</span> {impact}
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
export const PlanPanel = memo(function PlanPanel({ envelope }: PlanPanelProps) {
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
      <h4>Your day</h4>
      <div className="routine">
        {PARTS_OF_DAY.map((part) => (
          <section key={part} aria-label={PART_LABEL[part]}>
            <h5>{PART_LABEL[part]}</h5>
            <ItemList items={plan.routine[part]} impacts={impacts} />
          </section>
        ))}
      </div>
      <h4>Cleaner air at home</h4>
      <ItemList items={plan.indoor} impacts={impacts} />
      <h4>Lower-emission swaps</h4>
      <ItemList items={plan.alternatives} impacts={impacts} />
      <ShareBox text={plan.shareText} />
    </article>
  );
});
