"use client";

import { useCallback, useState } from "react";
import type { Place } from "../domain/air";
import { isInIndia, roundCoordinate } from "../domain/geo";

export const LOCATION_MESSAGES = {
  unsupported: "This browser can't share your location. Search for your town instead.",
  denied: "Your location wasn't shared. Search for your town instead.",
  outside: "That location looks outside India, which is all this assistant covers. Search instead.",
} as const;

/**
 * Asks the browser for the device's location, once, when the user presses the
 * button. Only a place inside India is passed on, rounded to about 1 km.
 */
export function useDeviceLocation(onFound: (place: Place) => void) {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setMessage(LOCATION_MESSAGES.unsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const point = { latitude: coords.latitude, longitude: coords.longitude };
        if (!isInIndia(point)) {
          setMessage(LOCATION_MESSAGES.outside);
          return;
        }
        setMessage(null);
        onFound({
          name: "Your location",
          region: null,
          latitude: roundCoordinate(point.latitude),
          longitude: roundCoordinate(point.longitude),
        });
      },
      () => {
        setLocating(false);
        setMessage(LOCATION_MESSAGES.denied);
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }, [onFound]);

  return { locating, message, locate, clearMessage: () => setMessage(null) };
}
