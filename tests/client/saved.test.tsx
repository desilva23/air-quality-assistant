import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createSavedStore, useHousehold, usePlace } from "@/lib/client/saved";
import { DEFAULT_HOUSEHOLD } from "@/lib/domain/household";
import * as z from "@/lib/zod";
import { FAMILY, PLACE } from "../support/fixtures";

describe("saved household and place", () => {
  it("start from the defaults and remember changes in localStorage", () => {
    const household = renderHook(() => useHousehold());
    const place = renderHook(() => usePlace());
    expect(household.result.current[0]).toEqual(DEFAULT_HOUSEHOLD);
    expect(place.result.current[0]).toBeNull();
    act(() => {
      household.result.current[1](FAMILY);
      place.result.current[1](PLACE);
    });
    expect(household.result.current[0]).toEqual(FAMILY);
    expect(JSON.parse(localStorage.getItem("aqa:place:v1") ?? "null")).toEqual(PLACE);
  });
});

describe("createSavedStore", () => {
  const schema = z.object({ n: z.number() });

  it("reads a valid saved value once, and ignores invalid or unreadable ones", () => {
    localStorage.setItem("good", '{"n":2}');
    localStorage.setItem("bad", '{"n":"two"}');
    localStorage.setItem("broken", "{");
    expect(createSavedStore("good", schema, { n: 0 }).getSnapshot()).toEqual({ n: 2 });
    expect(createSavedStore("bad", schema, { n: 0 }).getSnapshot()).toEqual({ n: 0 });
    expect(createSavedStore("broken", schema, { n: 0 }).getSnapshot()).toEqual({ n: 0 });
    expect(createSavedStore("missing", schema, { n: 0 }).getServerSnapshot()).toEqual({ n: 0 });
  });

  it("keeps working when storage is blocked, and tells subscribers about changes", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const store = createSavedStore("k", schema, { n: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.save({ n: 5 });
    expect(store.getSnapshot()).toEqual({ n: 5 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.save({ n: 6 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
