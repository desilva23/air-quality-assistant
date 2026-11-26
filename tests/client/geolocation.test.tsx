import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCATION_MESSAGES, useDeviceLocation } from "@/lib/client/geolocation";

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;

function stubGeolocation(answer: (success: Success, failure: () => void) => void) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(answer) },
  });
}

describe("useDeviceLocation", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("passes on a place in India, rounded to about a kilometre", () => {
    stubGeolocation((success) => success({ coords: { latitude: 19.07609, longitude: 72.87766 } }));
    const onFound = vi.fn();
    const { result } = renderHook(() => useDeviceLocation(onFound));
    act(() => result.current.locate());
    expect(onFound).toHaveBeenCalledWith({
      name: "Your location",
      region: null,
      latitude: 19.08,
      longitude: 72.88,
    });
    expect(result.current.locating).toBe(false);
  });

  it("explains a location outside India, a refusal, and a browser without location", () => {
    const onFound = vi.fn();
    stubGeolocation((success) => success({ coords: { latitude: 51.5, longitude: -0.1 } }));
    const { result } = renderHook(() => useDeviceLocation(onFound));
    act(() => result.current.locate());
    expect(result.current.message).toBe(LOCATION_MESSAGES.outside);

    stubGeolocation((_, failure) => failure());
    act(() => result.current.locate());
    expect(result.current.message).toBe(LOCATION_MESSAGES.denied);
    act(() => result.current.clearMessage());
    expect(result.current.message).toBeNull();

    Reflect.deleteProperty(navigator, "geolocation");
    act(() => result.current.locate());
    expect(result.current.message).toBe(LOCATION_MESSAGES.unsupported);
    expect(onFound).not.toHaveBeenCalled();
  });
});
