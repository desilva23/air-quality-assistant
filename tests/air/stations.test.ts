import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAP_STATIONS, nearbyStations } from "@/lib/air/openaq";
import { stationsNear } from "@/lib/air/report";
import { json, stubFetch } from "../support/fetch";

const NOW = Date.parse("2026-11-25T18:00:00Z");
const fresh = "2026-11-25T17:00:00Z";
const point = { latitude: 28.61, longitude: 77.21 };

function location(id: number, latitude: number, name: string | null = `Station ${String(id)}`) {
  return {
    id,
    name,
    provider: { name: "CPCB" },
    coordinates: { latitude, longitude: 77.21 },
    datetimeLast: { utc: fresh },
    sensors: [{ id: id * 10 + 1, parameter: { name: "pm25", units: "µg/m³" } }],
  };
}

describe("nearbyStations", () => {
  it("returns the nearest fresh stations with their latest PM2.5, skipping failures and blanks", async () => {
    const locations = Array.from({ length: 10 }, (_, i) => location(i + 1, 28.62 + i * 0.01));
    locations.push(location(99, 28.6105, null));
    stubFetch((url) => {
      const match = /locations\/(\d+)\/latest/.exec(url);
      if (!match) return json({ results: locations });
      const id = Number(match[1]);
      if (id === 2) return json({}, 500);
      if (id === 3) return json({ results: [] });
      return json({
        results: [{ datetime: { utc: fresh }, value: 100 + id, sensorsId: id * 10 + 1 }],
      });
    });
    const stations = await nearbyStations(point, "key", NOW);
    expect(stations[0]).toEqual({
      name: "",
      latitude: 28.6105,
      longitude: 77.21,
      distanceKm: 0.1,
      pm25: 199,
      measuredAt: fresh,
    });
    expect(stations.map((s) => s.name)).not.toContain("Station 2");
    expect(stations.map((s) => s.name)).not.toContain("Station 3");
    expect(stations).toHaveLength(MAP_STATIONS - 2);
  });

  it("uses the real clock by default", async () => {
    stubFetch(() => json({ results: [] }));
    expect(await nearbyStations(point, "key")).toEqual([]);
  });
});

describe("stationsNear", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("says station readings are off without a key", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "");
    expect(await stationsNear(point)).toEqual({ enabled: false, stations: [] });
  });

  it("looks stations up with the key", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "key");
    stubFetch(() => json({ results: [] }));
    expect(await stationsNear(point)).toEqual({ enabled: true, stations: [] });
  });
});
