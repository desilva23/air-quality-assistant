import { beforeEach, describe, expect, it, vi } from "vitest";
import { airReport } from "@/lib/air/report";
import { modelAir } from "@/lib/air/open-meteo";
import { stationReading } from "@/lib/air/openaq";
import { MODEL_READING, STATION_READING, outlookFrom } from "../support/fixtures";

vi.mock("@/lib/air/open-meteo", async (original) => {
  const actual: object = await original();
  return { ...actual, modelAir: vi.fn() };
});
vi.mock("@/lib/air/openaq", async (original) => {
  const actual: object = await original();
  return { ...actual, stationReading: vi.fn() };
});

const point = { latitude: 28.61, longitude: 77.21 };
const outlook = outlookFrom([100, 90]);

describe("airReport", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(modelAir).mockResolvedValue({ current: MODEL_READING, outlook });
    vi.mocked(stationReading).mockResolvedValue(STATION_READING);
  });

  it("prefers a fresh station reading and adds the model's forecast", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "key");
    expect(await airReport(point, 1)).toEqual({
      reading: STATION_READING,
      outlook,
      outlookSource: "Open-Meteo (CAMS model)",
      note: null,
    });
    expect(stationReading).toHaveBeenCalledWith(point, "key", 1);
  });

  it("keeps the station reading when the model fails, without a forecast", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "key");
    vi.mocked(modelAir).mockRejectedValue(new Error("Open-Meteo returned 500"));
    expect(await airReport(point)).toMatchObject({
      reading: STATION_READING,
      outlook: [],
      outlookSource: null,
    });
    expect(console.error).toHaveBeenCalledWith("[air] Open-Meteo returned 500");
  });

  it("uses the model and says why when station readings are off", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "");
    const result = await airReport(point);
    expect(stationReading).not.toHaveBeenCalled();
    expect(result.reading).toEqual(MODEL_READING);
    expect(result.note).toBe("stations-off");
  });

  it("says when the station network failed or had nothing recent", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "key");
    vi.mocked(stationReading).mockRejectedValueOnce("not an error");
    expect((await airReport(point)).note).toBe("stations-down");
    expect(console.error).toHaveBeenCalledWith("[air] UnknownError");
    vi.mocked(stationReading).mockResolvedValueOnce(null);
    expect((await airReport(point)).note).toBe("no-fresh-station");
  });

  it("fails when neither source answers", async () => {
    vi.stubEnv("OPENAQ_API_KEY", "key");
    vi.mocked(stationReading).mockResolvedValue(null);
    vi.mocked(modelAir).mockRejectedValue(new Error("down"));
    await expect(airReport(point)).rejects.toThrow("No air data source answered");
  });
});
