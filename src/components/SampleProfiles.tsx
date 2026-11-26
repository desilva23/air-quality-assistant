"use client";

import { memo } from "react";
import { SAMPLES, type Sample } from "@/lib/samples";

export interface SampleProfilesProps {
  onPick: (sample: Sample) => void;
}

/** One-tap example households, so anyone can see how advice changes with the household. */
export const SampleProfiles = memo(function SampleProfiles({ onPick }: SampleProfilesProps) {
  return (
    <div className="samples">
      <p className="small">Or try an example household (the air data is still live):</p>
      <ul>
        {SAMPLES.map((sample) => (
          <li key={sample.id}>
            <button type="button" className="sample" onClick={() => onPick(sample)}>
              <strong>{sample.label}</strong>
              <span>{sample.summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});
