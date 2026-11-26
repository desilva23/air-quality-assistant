import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDeviceLocation } from "@/lib/client/geolocation";

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

  it("passes on a point in India, rounded to about a kilometre", () => {
    stubGeolocation((success) => success({ coords: { latitude: 19.07609, longitude: 72.87766 } }));
    const onFound = vi.fn();
    const { result } = renderHook(() => useDeviceLocation(onFound));
    act(() => result.current.locate());
    expect(onFound).toHaveBeenCalledWith({ latitude: 19.08, longitude: 72.88 });
    expect(result.current.locating).toBe(false);
  });

  it("reports a location outside India, a refusal, and a browser without location", () => {
    const onFound = vi.fn();
    stubGeolocation((success) => success({ coords: { latitude: 51.5, longitude: -0.1 } }));
    const { result } = renderHook(() => useDeviceLocation(onFound));
    act(() => result.current.locate());
    expect(result.current.problem).toBe("outside");

    stubGeolocation((_, failure) => failure());
    act(() => result.current.locate());
    expect(result.current.problem).toBe("denied");
    act(() => result.current.clearProblem());
    expect(result.current.problem).toBeNull();

    Reflect.deleteProperty(navigator, "geolocation");
    act(() => result.current.locate());
    expect(result.current.problem).toBe("unsupported");
    expect(onFound).not.toHaveBeenCalled();
  });
});
