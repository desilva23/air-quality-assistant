"use client";

import { memo } from "react";
import { SAMPLES, type Sample } from "@/lib/samples";
import { useLanguage, useMessages } from "./i18n";

export interface SampleProfilesProps {
  onPick: (sample: Sample) => void;
}

/** One-tap example households, so anyone can see how advice changes with the household. */
export const SampleProfiles = memo(function SampleProfiles({ onPick }: SampleProfilesProps) {
  const { where } = useMessages();
  const language = useLanguage();
  return (
    <div className="samples">
      <p className="small">{where.samples}</p>
      <ul>
        {SAMPLES.map((sample) => (
          <li key={sample.id}>
            <button type="button" className="sample" onClick={() => onPick(sample)}>
              <strong>{sample.text[language].label}</strong>
              <span>{sample.text[language].summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});
