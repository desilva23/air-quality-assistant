"use client";

import { useId, useState, type KeyboardEvent } from "react";

export interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onCommit: (value: number) => void;
}

/**
 * A number input that commits on blur or Enter rather than on every keystroke,
 * clamped to its range. Give it `key={value}` so an outside change resets the draft.
 */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onCommit,
}: Readonly<NumberFieldProps>) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  function commit() {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) && draft.trim() !== "" ? parsed : value;
    const clamped = Math.min(max, Math.max(min, next));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {unit && <span className="unit"> ({unit})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}

/** A select over a fixed list. The chosen value is looked up in that list, never cast. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: Readonly<SelectFieldProps<T>>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const chosen = options.find((option) => option === event.target.value);
          if (chosen) onChange(chosen);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: Readonly<CheckboxFieldProps>) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
