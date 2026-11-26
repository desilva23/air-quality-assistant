"use client";

import { memo } from "react";
import type { Household } from "@/lib/domain/household";
import {
  ActivityFieldset,
  CommuteFieldset,
  HomeFieldset,
  MembersFieldset,
} from "./HouseholdFieldsets";

export interface HouseholdFormProps {
  value: Household;
  onChange: (value: Household) => void;
}

/** Who lives in the home and how they spend the day. Every change is saved in this browser. */
export const HouseholdForm = memo(function HouseholdForm({ value, onChange }: HouseholdFormProps) {
  const { members, commute, activity, home } = value;
  return (
    <form className="household" onSubmit={(event) => event.preventDefault()}>
      <MembersFieldset
        value={members}
        onChange={(patch) => onChange({ ...value, members: { ...members, ...patch } })}
      />
      <CommuteFieldset
        value={commute}
        onChange={(patch) => onChange({ ...value, commute: { ...commute, ...patch } })}
      />
      <ActivityFieldset
        value={activity}
        onChange={(patch) => onChange({ ...value, activity: { ...activity, ...patch } })}
      />
      <HomeFieldset
        value={home}
        onChange={(patch) => onChange({ ...value, home: { ...home, ...patch } })}
        mask={value.mask}
        onMaskChange={(mask) => onChange({ ...value, mask })}
      />
      <p className="muted small">
        Saved in this browser only. It is sent to the server only when you ask for a plan or an
        answer, and it is never logged.
      </p>
    </form>
  );
});
