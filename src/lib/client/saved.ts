// The household and place live in this browser's localStorage and nowhere
// else. Values are validated on every read, so a saved copy from another
// version of the app, or one edited by hand, falls back to the default.

import { useSyncExternalStore } from "react";
import type { z } from "zod";
import { PlaceSchema, type Place } from "../domain/air";
import { DEFAULT_HOUSEHOLD, HouseholdSchema, type Household } from "../domain/household";
import { LanguageSchema, type Language } from "../i18n/language";

interface SavedStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  save: (value: T) => void;
}

function read<T>(key: string, schema: z.ZodType<T>, initial: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initial;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : initial;
  } catch {
    // Storage blocked (some private modes) or unreadable JSON.
    return initial;
  }
}

export function createSavedStore<T>(key: string, schema: z.ZodType<T>, initial: T): SavedStore<T> {
  const listeners = new Set<() => void>();
  let current: { value: T } | null = null;
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      current ??= { value: read(key, schema, initial) };
      return current.value;
    },
    getServerSnapshot: () => initial,
    save(value) {
      current = { value };
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage full or blocked: the app still works, it just won't remember.
      }
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}

const household = createSavedStore("aqa:household:v1", HouseholdSchema, DEFAULT_HOUSEHOLD);
const place = createSavedStore<Place | null>("aqa:place:v1", PlaceSchema.nullable(), null);
const language = createSavedStore<Language>("aqa:language:v1", LanguageSchema, "en");

function useSaved<T>(store: SavedStore<T>): [T, (value: T) => void] {
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return [value, store.save];
}

export const useHousehold = (): [Household, (value: Household) => void] => useSaved(household);
export const usePlace = (): [Place | null, (value: Place | null) => void] => useSaved(place);
export const useSavedLanguage = (): [Language, (value: Language) => void] => useSaved(language);
