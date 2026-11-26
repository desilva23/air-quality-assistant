// CO₂ and petrol from the daily commute. Factors are from the India GHG
// Program's India Specific Road Transport Emission Factors (v1.0, 2015), using
// the paper's real-world figures (with its 10% uplift) where it gives them.

import type { CommuteMode } from "./household";

/** kg CO₂ per vehicle-km, except bus and metro, which are per passenger-km. */
const KG_CO2_PER_KM: Record<CommuteMode, number> = {
  none: 0,
  walk: 0,
  cycle: 0,
  /** Scooter under 110 cc. */
  "two-wheeler": 0.0368,
  /** CNG three-wheeler. */
  auto: 0.10768,
  /** Intra-city bus, per passenger-km. */
  bus: 0.015161,
  /** The paper has no metro factor; the bus figure is used as a conservative stand-in. */
  metro: 0.015161,
  /** Petrol hatchback under 1400 cc. */
  car: 0.14,
};

/** The traveller's share of a day's commute CO₂, both ways, in kg. */
export function commuteKgPerDay(mode: CommuteMode, oneWayKm: number, sharedBy = 1): number {
  return (KG_CO2_PER_KM[mode] * 2 * oneWayKm) / Math.max(1, sharedBy);
}

/** Weekly saving from switching modes, in kg, never negative. */
export function weeklySavingKg(
  from: CommuteMode,
  to: CommuteMode,
  oneWayKm: number,
  daysPerWeek: number,
): number {
  const perDay = commuteKgPerDay(from, oneWayKm) - commuteKgPerDay(to, oneWayKm);
  return Math.max(0, perDay * daysPerWeek);
}

/** kg CO₂ from burning a litre of petrol, from the same paper. */
const KG_CO2_PER_LITRE_PETROL = 2.27193;

/** ₹ per litre of petrol: Delhi's retail price, rounded. It differs by state and over time. */
const RUPEES_PER_LITRE_PETROL = 95;

/** Scooters and cars run on petrol here; an auto-rickshaw is taken to run on CNG. */
export function isPetrolVehicle(mode: CommuteMode): boolean {
  return mode === "two-wheeler" || mode === "car";
}

/** The cost of the petrol whose burning gives off this much CO₂, in rupees. */
export function petrolRupees(kgCo2: number): number {
  return (kgCo2 / KG_CO2_PER_LITRE_PETROL) * RUPEES_PER_LITRE_PETROL;
}

/** "₹880": whole rupees, to the nearest ₹10 above ₹100, with Indian digit grouping. */
export function formatRupees(amount: number): string {
  const rounded = amount >= 100 ? Math.round(amount / 10) * 10 : Math.round(amount);
  return `₹${rounded.toLocaleString("en-IN")}`;
}

/** Rounded for reading: one decimal under 10 kg, whole numbers above. */
export function formatKg(kg: number): string {
  return kg < 10 ? kg.toFixed(1) : String(Math.round(kg));
}
