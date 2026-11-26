"use client";

import { useCallback, useState } from "react";
import { isInIndia, roundCoordinate, type Coordinates } from "../domain/geo";

/** Why the device's location couldn't be used; the interface words it. */
export type LocationProblem = "unsupported" | "denied" | "outside";

/**
 * Asks the browser for the device's location, once, when the user presses the
 * button. Only a point inside India is passed on, rounded to about 1 km.
 */
export function useDeviceLocation(onFound: (point: Coordinates) => void) {
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<LocationProblem | null>(null);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setProblem("unsupported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const point = { latitude: coords.latitude, longitude: coords.longitude };
        if (!isInIndia(point)) {
          setProblem("outside");
          return;
        }
        setProblem(null);
        onFound({
          latitude: roundCoordinate(point.latitude),
          longitude: roundCoordinate(point.longitude),
        });
      },
      () => {
        setLocating(false);
        setProblem("denied");
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }, [onFound]);

  return { locating, problem, locate, clearProblem: () => setProblem(null) };
}
