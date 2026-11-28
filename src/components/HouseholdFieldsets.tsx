"use client";

import {
  ACTIVITIES,
  COMMUTE_MODES,
  COOKING_FUELS,
  MASKS,
  MAX_ACTIVITY_MINUTES,
  MAX_COMMUTE_KM,
  PARTS_OF_DAY,
  type Household,
  type Mask,
} from "@/lib/domain/household";
import { CheckboxField, NumberField, SelectField } from "./fields";
import { useLabels, useMessages } from "./i18n";

export interface SectionProps<K extends keyof Household> {
  value: Household[K];
  onChange: (patch: Partial<Household[K]>) => void;
}

const MEMBERS: readonly (keyof Household["members"])[] = [
  "children",
  "seniors",
  "respiratory",
  "pregnant",
];

export function MembersFieldset({ value, onChange }: Readonly<SectionProps<"members">>) {
  const { household } = useMessages();
  return (
    <fieldset>
      <legend>{household.members}</legend>
      {MEMBERS.map((key) => (
        <CheckboxField
          key={key}
          label={household.member[key]}
          checked={value[key]}
          onChange={(checked) => onChange({ [key]: checked })}
        />
      ))}
    </fieldset>
  );
}

export function CommuteFieldset({ value, onChange }: Readonly<SectionProps<"commute">>) {
  const { household } = useMessages();
  const labels = useLabels();
  return (
    <fieldset>
      <legend>{household.commute}</legend>
      <SelectField
        label={household.travel}
        value={value.mode}
        options={COMMUTE_MODES}
        labels={labels.mode}
        onChange={(mode) => onChange({ mode })}
      />
      {value.mode !== "none" && (
        <div className="field-row">
          <NumberField
            key={`km-${String(value.distanceKm)}`}
            label={household.distance}
            unit={household.km}
            value={value.distanceKm}
            min={0}
            max={MAX_COMMUTE_KM}
            step={0.5}
            onCommit={(distanceKm) => onChange({ distanceKm })}
          />
          <NumberField
            key={`days-${String(value.daysPerWeek)}`}
            label={household.days}
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

export function ActivityFieldset({ value, onChange }: Readonly<SectionProps<"activity">>) {
  const { household } = useMessages();
  const labels = useLabels();
  return (
    <fieldset>
      <legend>{household.routine}</legend>
      <SelectField
        label={household.activity}
        value={value.kind}
        options={ACTIVITIES}
        labels={labels.activity}
        onChange={(kind) => onChange({ kind })}
      />
      {value.kind !== "none" && (
        <div className="field-row">
          <SelectField
            label={household.partOfDay}
            value={value.partOfDay}
            options={PARTS_OF_DAY}
            labels={labels.part}
            onChange={(partOfDay) => onChange({ partOfDay })}
          />
          <NumberField
            key={`minutes-${String(value.minutes)}`}
            label={household.duration}
            unit={household.minutes}
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

export function HomeFieldset({ value, onChange, mask, onMaskChange }: Readonly<HomeFieldsetProps>) {
  const { household } = useMessages();
  const labels = useLabels();
  return (
    <fieldset>
      <legend>{household.home}</legend>
      <CheckboxField
        label={household.purifier}
        checked={value.purifier}
        onChange={(purifier) => onChange({ purifier })}
      />
      <CheckboxField
        label={household.smoker}
        checked={value.smoker}
        onChange={(smoker) => onChange({ smoker })}
      />
      <SelectField
        label={household.cooking}
        value={value.cooking}
        options={COOKING_FUELS}
        labels={labels.cooking}
        onChange={(cooking) => onChange({ cooking })}
      />
      <SelectField
        label={household.mask}
        value={mask}
        options={MASKS}
        labels={labels.mask}
        onChange={onMaskChange}
      />
    </fieldset>
  );
}
