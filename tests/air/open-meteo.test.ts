import { describe, expect, it } from "vitest";
import { modelAir, searchPlaces } from "@/lib/air/open-meteo";
import { json, stubFetch } from "../support/fetch";

const airReply = {
  current: { time: "2026-11-25T22:30", pm2_5: 140.2, pm10: 141.6 },
  hourly: {
    time: ["2026-11-25T21:00", "2026-11-25T22:00", "2026-11-25T23:00", "2026-11-26T00:00"],
    pm2_5: [150, 140, null, 130],
  },
};

describe("Open-Meteo air quality", () => {
  it("asks for the point in IST and returns the current estimate and the forecast from this hour", async () => {
    const fetch = stubFetch(() => json(airReply));
    const air = await modelAir({ latitude: 28.61, longitude: 77.21 });
    const url = new URL(fetch.mock.calls[0]?.[0] ?? "");
    expect(url.origin + url.pathname).toBe("https://air-quality-api.open-meteo.com/v1/air-quality");
    expect(url.searchParams.get("latitude")).toBe("28.61");
    expect(url.searchParams.get("timezone")).toBe("Asia/Kolkata");
    expect(air.current).toEqual({
      pm25: 140.2,
      pm10: 141.6,
      measuredAt: "2026-11-25T22:30:00+05:30",
      kind: "model",
      source: "Open-Meteo (CAMS model)",
      station: null,
      distanceKm: null,
    });
    // Past hours and missing values are dropped.
    expect(air.outlook).toEqual([
      { time: "2026-11-25T22:00:00+05:30", pm25: 140 },
      { time: "2026-11-26T00:00:00+05:30", pm25: 130 },
    ]);
  });

  it("fails clearly when there's no PM2.5 for the point", async () => {
    stubFetch(() => json({ ...airReply, current: { ...airReply.current, pm2_5: null } }));
    await expect(modelAir({ latitude: 28.61, longitude: 77.21 })).rejects.toThrow(
      "Open-Meteo has no PM2.5 for this place",
    );
  });
});

describe("Open-Meteo place search", () => {
  it("returns Indian places only, with their state", async () => {
    const fetch = stubFetch(() =>
      json({
        results: [
          {
            name: "Noida",
            latitude: 28.58,
            longitude: 77.33,
            country_code: "IN",
            admin1: "Uttar Pradesh",
          },
          {
            name: "Lahore",
            latitude: 31.55,
            longitude: 74.34,
            country_code: "PK",
            admin1: "Punjab",
          },
          { name: "Port Blair", latitude: 11.67, longitude: 92.74, country_code: "IN" },
        ],
      }),
    );
    expect(await searchPlaces("No")).toEqual([
      { name: "Noida", region: "Uttar Pradesh", latitude: 28.58, longitude: 77.33 },
      { name: "Port Blair", region: null, latitude: 11.67, longitude: 92.74 },
    ]);
    expect(new URL(fetch.mock.calls[0]?.[0] ?? "").searchParams.get("countryCode")).toBe("IN");
  });

  it("returns an empty list when nothing matches", async () => {
    stubFetch(() => json({}));
    expect(await searchPlaces("Atlantis")).toEqual([]);
  });
});
