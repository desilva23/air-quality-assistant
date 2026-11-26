import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StationMap } from "@/components/StationMap";

const calls = vi.hoisted(() => ({
  markers: [] as unknown[][],
  fit: vi.fn(),
  remove: vi.fn(),
  tiles: vi.fn(),
}));

vi.mock("leaflet", () => {
  const chain = { addTo: () => chain, bindTooltip: () => chain };
  return {
    map: () => ({ fitBounds: calls.fit, remove: calls.remove }),
    tileLayer: (url: string, options: unknown) => {
      calls.tiles(url, options);
      return chain;
    },
    circleMarker: (...args: unknown[]) => {
      calls.markers.push(args);
      return chain;
    },
  };
});

const STATIONS = [
  {
    name: "ITO",
    latitude: 28.63,
    longitude: 77.24,
    distanceKm: 3.2,
    pm25: 180,
    measuredAt: "2026-11-26T09:30:00Z",
  },
];

describe("StationMap", () => {
  it("draws OpenStreetMap tiles, a dot per station in its band colour and one for you, then fits them", async () => {
    const { unmount, getByRole } = render(
      <StationMap centre={{ latitude: 28.61, longitude: 77.21 }} stations={STATIONS} label="Map" />,
    );
    expect(getByRole("region", { name: "Map" })).toBeInTheDocument();
    await waitFor(() => expect(calls.fit).toHaveBeenCalled());
    expect(calls.tiles.mock.calls[0]?.[0]).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
    expect(calls.markers).toHaveLength(2);
    expect(calls.markers[0]?.[1]).toMatchObject({ fillColor: "#e0412f" });
    expect(calls.fit.mock.calls[0]?.[0]).toEqual([
      [28.61, 77.21],
      [28.63, 77.24],
    ]);
    unmount();
    expect(calls.remove).toHaveBeenCalled();
  });

  it("does nothing if it unmounts before Leaflet arrives", async () => {
    calls.fit.mockClear();
    const { unmount } = render(
      <StationMap centre={{ latitude: 28.61, longitude: 77.21 }} stations={[]} label="Map" />,
    );
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls.fit).not.toHaveBeenCalled();
  });
});
