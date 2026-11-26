/** A box around India. Coarse by design: it rejects places clearly elsewhere. */
export const INDIA_BOUNDS = { minLat: 6, maxLat: 38, minLon: 68, maxLon: 98 } as const;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function isInIndia({ latitude, longitude }: Coordinates): boolean {
  const { minLat, maxLat, minLon, maxLon } = INDIA_BOUNDS;
  return latitude >= minLat && latitude <= maxLat && longitude >= minLon && longitude <= maxLon;
}

/** Two decimal places, about 1 km: precise enough for air data, and shared by nearby requests. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance (haversine). */
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}
