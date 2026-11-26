// When in the day the air is cleanest. Works on the hourly PM2.5 forecast for
// the next 24 hours, in IST.

import type { OutlookHour } from "./air";
import type { PartOfDay } from "./household";
import { istHour } from "./time";

interface HourRange {
  /** First hour an activity may start, IST. */
  from: number;
  /** Last hour an activity may start, IST. */
  to: number;
}

const PART_HOURS: Record<PartOfDay, HourRange & { usual: number }> = {
  morning: { from: 6, to: 11, usual: 7 },
  afternoon: { from: 12, to: 16, usual: 13 },
  evening: { from: 17, to: 21, usual: 18 },
};

const WAKING_HOURS: HourRange = { from: 6, to: 21 };

export interface TimeWindow {
  start: string;
  /** Mean forecast PM2.5 over the window, µg/m³. */
  average: number;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Windows of `hours` hours that fit inside the next day and start within `range`. */
function windows(outlook: OutlookHour[], hours: number, range: HourRange): TimeWindow[] {
  const day = outlook.slice(0, 24);
  return day.flatMap((hour, index) => {
    const span = day.slice(index, index + hours);
    const startHour = istHour(hour.time);
    if (span.length < hours || startHour < range.from || startHour > range.to) return [];
    return [{ start: hour.time, average: mean(span.map((h) => h.pm25)) }];
  });
}

/** Whole hours an activity of `minutes` occupies, at least one. */
export function hoursFor(minutes: number): number {
  return Math.max(1, Math.ceil(minutes / 60));
}

/** The cleanest stretch of the coming day, between 6 am and 9 pm. */
export function cleanestWindow(outlook: OutlookHour[], hours = 1): TimeWindow | null {
  const options = windows(outlook, hours, WAKING_HOURS);
  return options.reduce<TimeWindow | null>(
    (best, option) => (best === null || option.average < best.average ? option : best),
    null,
  );
}

/** The window at the usual time for this part of the day. */
export function usualWindow(outlook: OutlookHour[], part: PartOfDay, hours = 1): TimeWindow | null {
  const { usual } = PART_HOURS[part];
  return windows(outlook, hours, { from: usual, to: usual })[0] ?? null;
}

/** Mean forecast PM2.5 for each part of the coming day; null when the forecast doesn't cover it. */
export function partAverages(outlook: OutlookHour[]): Record<PartOfDay, number | null> {
  const day = outlook.slice(0, 24);
  const averageFor = ({ from, to }: HourRange): number | null => {
    const values = day.filter((h) => istHour(h.time) >= from && istHour(h.time) <= to);
    return values.length ? mean(values.map((h) => h.pm25)) : null;
  };
  return {
    morning: averageFor(PART_HOURS.morning),
    afternoon: averageFor(PART_HOURS.afternoon),
    evening: averageFor(PART_HOURS.evening),
  };
}

/** The highest forecast hour of the coming day. */
export function peakHour(outlook: OutlookHour[]): OutlookHour | null {
  return outlook
    .slice(0, 24)
    .reduce<OutlookHour | null>(
      (peak, hour) => (peak && peak.pm25 >= hour.pm25 ? peak : hour),
      null,
    );
}
