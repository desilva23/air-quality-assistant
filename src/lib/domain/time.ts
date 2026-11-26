// Every user is in India, so times are shown and planned in IST whatever the
// device's own time zone.

const IST = "Asia/Kolkata";

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: IST,
});

const clockFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: IST,
});

const hourLabelFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", timeZone: IST });

/** Hour of the day in IST, 0–23. */
export function istHour(iso: string): number {
  return Number(hourFormat.format(new Date(iso)));
}

/** "2:00 pm" in IST. */
export function formatClock(iso: string): string {
  return clockFormat.format(new Date(iso));
}

/** "2 pm" in IST, for chart axes. */
export function formatHour(iso: string): string {
  return hourLabelFormat.format(new Date(iso));
}
