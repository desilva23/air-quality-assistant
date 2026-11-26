"use client";

import {
  ACTIVITIES,
  ACTIVITY_LABEL,
  COMMUTE_MODES,
  COOKING_FUELS,
  COOKING_LABEL,
  MASK_LABEL,
  MASKS,
  MAX_ACTIVITY_MINUTES,
  MAX_COMMUTE_KM,
  MODE_LABEL,
  PART_LABEL,
  PARTS_OF_DAY,
  type Household,
  type Mask,
} from "@/lib/domain/household";
import { CheckboxField, NumberField, SelectField } from "./fields";

export interface SectionProps<K extends keyof Household> {
  value: Household[K];
  onChange: (patch: Partial<Household[K]>) => void;
}

const MEMBERS: readonly { key: keyof Household["members"]; label: string }[] = [
  { key: "children", label: "Children under 12" },
  { key: "seniors", label: "Adults over 60" },
  { key: "respiratory", label: "Someone with asthma, COPD or a heart condition" },
  { key: "pregnant", label: "Someone who is pregnant" },
];

export function MembersFieldset({ value, onChange }: SectionProps<"members">) {
  return (
    <fieldset>
      <legend>Who lives with you?</legend>
      {MEMBERS.map(({ key, label }) => (
        <CheckboxField
          key={key}
          label={label}
          checked={value[key]}
          onChange={(checked) => onChange({ [key]: checked })}
        />
      ))}
    </fieldset>
  );
}

export function CommuteFieldset({ value, onChange }: SectionProps<"commute">) {
  return (
    <fieldset>
      <legend>Daily commute</legend>
      <SelectField
        label="How you usually travel"
        value={value.mode}
        options={COMMUTE_MODES}
        labels={MODE_LABEL}
        onChange={(mode) => onChange({ mode })}
      />
      {value.mode !== "none" && (
        <div className="field-row">
          <NumberField
            key={`km-${String(value.distanceKm)}`}
            label="Distance each way"
            unit="km"
            value={value.distanceKm}
            min={0}
            max={MAX_COMMUTE_KM}
            step={0.5}
            onCommit={(distanceKm) => onChange({ distanceKm })}
          />
          <NumberField
            key={`days-${String(value.daysPerWeek)}`}
            label="Days a week"
            value={value.daysPerWeek}
            min={0}
            max={7}
            onCommit={(days) => onChange({ daysPerWeek: Math.round(days) })}
          />
        </div>
      )}
    </fieldset>
  );
}

export function ActivityFieldset({ value, onChange }: SectionProps<"activity">) {
  return (
    <fieldset>
      <legend>Outdoor routine</legend>
      <SelectField
        label="Main outdoor activity"
        value={value.kind}
        options={ACTIVITIES}
        labels={ACTIVITY_LABEL}
        onChange={(kind) => onChange({ kind })}
      />
      {value.kind !== "none" && (
        <div className="field-row">
          <SelectField
            label="Usually in the"
            value={value.partOfDay}
            options={PARTS_OF_DAY}
            labels={PART_LABEL}
            onChange={(partOfDay) => onChange({ partOfDay })}
          />
          <NumberField
            key={`minutes-${String(value.minutes)}`}
            label="For how long"
            unit="minutes"
            value={value.minutes}
            min={0}
            max={MAX_ACTIVITY_MINUTES}
            step={5}
            onCommit={(minutes) => onChange({ minutes: Math.round(minutes) })}
          />
        </div>
      )}
    </fieldset>
  );
}

export interface HomeFieldsetProps extends SectionProps<"home"> {
  mask: Mask;
  onMaskChange: (mask: Mask) => void;
}

export function HomeFieldset({ value, onChange, mask, onMaskChange }: HomeFieldsetProps) {
  return (
    <fieldset>
      <legend>Home and habits</legend>
      <CheckboxField
        label="We have an air purifier"
        checked={value.purifier}
        onChange={(purifier) => onChange({ purifier })}
      />
      <CheckboxField
        label="Someone smokes at home"
        checked={value.smoker}
        onChange={(smoker) => onChange({ smoker })}
      />
      <SelectField
        label="Cooking fuel"
        value={value.cooking}
        options={COOKING_FUELS}
        labels={COOKING_LABEL}
        onChange={(cooking) => onChange({ cooking })}
      />
      <SelectField
        label="Mask you usually wear outside"
        value={mask}
        options={MASKS}
        labels={MASK_LABEL}
        onChange={onMaskChange}
      />
    </fieldset>
  );
}
