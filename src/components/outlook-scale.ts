// Layout numbers for the hourly forecast chart: the axis maximum, its ticks,
// and each hour's bar height as a percentage of the plot.

import type { OutlookHour } from "@/lib/domain/air";

/** India's 24-hour PM2.5 standard (NAAQS 2009), drawn as a reference line. */
export const PM25_DAILY_LIMIT = 60;

const TICK_STEPS = [20, 50, 100, 200];

export interface OutlookScale {
  max: number;
  ticks: number[];
  percent: (value: number) => number;
}

/** A clean axis that always shows the daily limit, with at most five ticks. */
export function outlookScale(hours: OutlookHour[]): OutlookScale {
  const top = Math.max(PM25_DAILY_LIMIT, ...hours.map((hour) => hour.pm25)) * 1.1;
  const step = TICK_STEPS.find((candidate) => top / candidate <= 4) ?? 200;
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, index) => index * step);
  return { max, ticks, percent: (value) => (Math.min(value, max) / max) * 100 };
}
