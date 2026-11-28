"use client";

import { memo, useId, useMemo, useState } from "react";
import { dayDose } from "@/lib/domain/choices";
import { reductionPercent } from "@/lib/domain/exposure";
import { MASKS, type Household, type Mask } from "@/lib/domain/household";
import { outdoorMinutes } from "@/lib/domain/impacts";
import { LOCALE } from "@/lib/i18n/language";
import { CheckboxField, SelectField } from "./fields";
import { useLabels, useLanguage, useMessages } from "./i18n";

export interface ChoicesPanelProps {
  /** Today's outdoor PM2.5, µg/m³. */
  pm25: number;
  household: Household;
}

const MAX_MINUTES = 240;
/** Where the slider starts when the household spends no time outdoors yet. */
const STARTING_MINUTES = 60;

interface DoseBarProps {
  label: string;
  cigarettes: number;
  widest: number;
  emphasis?: boolean;
}

function DoseBar({ label, cigarettes, widest, emphasis = false }: Readonly<DoseBarProps>) {
  return (
    <li className={emphasis ? "chosen" : undefined}>
      <span className="dose-label">{label}</span>
      <span className="dose-track" aria-hidden="true">
        <span className="dose-fill" style={{ width: `${String((cigarettes / widest) * 100)}%` }} />
      </span>
      <span className="dose-value">{cigarettes}</span>
    </li>
  );
}

/** A what-if for today: time outdoors, mask and purifier, and the dose each choice leaves. */
export const ChoicesPanel = memo(function ChoicesPanel({ pm25, household }: ChoicesPanelProps) {
  const m = useMessages();
  const labels = useLabels();
  const language = useLanguage();
  const sliderId = useId();
  const [minutes, setMinutes] = useState(() =>
    Math.min(MAX_MINUTES, outdoorMinutes(household) || STARTING_MINUTES),
  );
  const [mask, setMask] = useState<Mask>(household.mask);
  const [purifier, setPurifier] = useState(household.home.purifier);

  const chosen = useMemo(
    () => dayDose({ outdoorPm25: pm25, outdoorMinutes: minutes, mask, purifier }),
    [pm25, minutes, mask, purifier],
  );
  const baseline = useMemo(
    () => dayDose({ outdoorPm25: pm25, outdoorMinutes: minutes, mask: "none", purifier: false }),
    [pm25, minutes],
  );
  const cut = reductionPercent(baseline.micrograms, chosen.micrograms);
  const widest = Math.max(baseline.cigarettes, chosen.cigarettes, 0.1);

  return (
    <section aria-labelledby="choices-heading" className="card choices-card">
      <h2 id="choices-heading">{m.choices.heading}</h2>
      <p className="muted">{m.choices.intro(Math.round(pm25))}</p>
      <div className="field">
        <label htmlFor={sliderId}>{m.choices.minutes}</label>
        <span className="range-value" aria-hidden="true">
          {minutes} {m.household.minutes}
        </span>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={MAX_MINUTES}
          step={15}
          value={minutes}
          aria-valuetext={`${String(minutes)} ${m.household.minutes}`}
          onChange={(event) => setMinutes(Number(event.target.value))}
        />
      </div>
      <SelectField
        label={m.household.mask}
        value={mask}
        options={MASKS}
        labels={labels.mask}
        onChange={setMask}
      />
      <CheckboxField label={m.household.purifier} checked={purifier} onChange={setPurifier} />
      <p role="status" className="dose">
        {m.choices.result(chosen.cigarettes, chosen.micrograms.toLocaleString(LOCALE[language]))}
      </p>
      <ul className="dose-bars">
        <DoseBar label={m.choices.asSet} cigarettes={chosen.cigarettes} widest={widest} emphasis />
        <DoseBar label={m.choices.baseline} cigarettes={baseline.cigarettes} widest={widest} />
      </ul>
      {cut > 0 && <p className="small">{m.choices.cut(cut)}</p>}
    </section>
  );
});
