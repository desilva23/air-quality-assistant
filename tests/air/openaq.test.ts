import { describe, expect, it } from "vitest";
import { stationReading } from "@/lib/air/openaq";
import { json, stubFetch } from "../support/fetch";

const NOW = Date.parse("2026-11-25T18:00:00Z");
const fresh = "2026-11-25T17:00:00Z";
const stale = "2026-11-25T10:00:00Z";
const point = { latitude: 28.61, longitude: 77.21 };

function location(
  id: number,
  latitude: number,
  last: string | null,
  provider: string | null = "CPCB",
) {
  return {
    id,
    name: `Station ${String(id)}`,
    provider: provider === null ? null : { name: provider },
    coordinates: { latitude, longitude: 77.21 },
    datetimeLast: last === null ? null : { utc: last },
    sensors: [
      { id: id * 10 + 1, parameter: { name: "pm25", units: "µg/m³" } },
      { id: id * 10 + 2, parameter: { name: "pm10", units: "µg/m³" } },
      { id: id * 10 + 3, parameter: { name: "no2", units: "ppm" } },
    ],
  };
}

function respondWith(locations: unknown[], latest: Record<number, unknown[]>) {
  return stubFetch((url) => {
    const match = /locations\/(\d+)\/latest/.exec(url);
    return match ? json({ results: latest[Number(match[1])] ?? [] }) : json({ results: locations });
  });
}

describe("OpenAQ station readings", () => {
  it("uses the nearest station that reported recently, with its key", async () => {
    const fetch = respondWith(
      [
        location(1, 28.7, fresh),
        location(2, 28.62, stale),
        location(3, 28.64, fresh),
        location(4, 28.6, null),
      ],
      {
        3: [
          { datetime: { utc: fresh }, value: 182.4, sensorsId: 31 },
          { datetime: { utc: fresh }, value: 260, sensorsId: 32 },
        ],
      },
    );
    const reading = await stationReading(point, "test-key", NOW);
    expect(reading).toEqual({
      pm25: 182.4,
      pm10: 260,
      measuredAt: fresh,
      kind: "station",
      source: "OpenAQ (CPCB)",
      station: "Station 3",
      distanceKm: 3.3,
    });
    const search = new URL(fetch.mock.calls[0]?.[0] ?? "");
    expect(search.searchParams.get("coordinates")).toBe("28.61,77.21");
    expect(search.searchParams.get("radius")).toBe("25000");
    expect(fetch.mock.calls[1]?.[1]?.headers).toEqual({ "X-API-Key": "test-key" });
  });

  it("returns null when no station nearby reported recently", async () => {
    respondWith([location(2, 28.62, stale)], {});
    expect(await stationReading(point, "k", NOW)).toBeNull();
  });

  it("returns null when the station's PM2.5 is stale or implausible, and drops a bad PM10", async () => {
    respondWith([location(5, 28.62, fresh)], {
      5: [
        { datetime: { utc: stale }, value: 120, sensorsId: 51 },
        { datetime: { utc: fresh }, value: -999, sensorsId: 51 },
      ],
    });
    expect(await stationReading(point, "k", NOW)).toBeNull();

    respondWith([location(6, 28.62, fresh, null)], {
      6: [
        { datetime: { utc: fresh }, value: 90, sensorsId: 61 },
        { datetime: { utc: fresh }, value: 5000, sensorsId: 62 },
      ],
    });
    expect(await stationReading(point, "k", NOW)).toMatchObject({
      pm25: 90,
      pm10: null,
      source: "OpenAQ (monitoring network)",
    });
  });

  it("copes with a station that has no name", async () => {
    respondWith([{ ...location(7, 28.62, fresh), name: null }], {
      7: [{ datetime: { utc: fresh }, value: 75, sensorsId: 71 }],
    });
    expect((await stationReading(point, "k", NOW))?.station).toBeNull();
  });

  it("uses the real clock by default", async () => {
    respondWith([], {});
    expect(await stationReading(point, "k")).toBeNull();
  });
});
