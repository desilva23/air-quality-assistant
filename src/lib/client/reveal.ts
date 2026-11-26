"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Brings an element into view the next time `ready` turns true after the user
 * asked for it, as when a place they picked gets its reading. On a phone the
 * reading would otherwise land out of sight. Nothing scrolls on page load.
 */
export function useRevealWhenReady(ready: boolean) {
  const targetRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!ready || !asked.current) return;
    asked.current = false;
    targetRef.current?.scrollIntoView({ block: "nearest" });
  }, [ready]);

  const ask = useCallback(() => {
    asked.current = true;
  }, []);

  return { targetRef, ask };
}
