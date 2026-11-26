import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as air } from "@/app/api/air/route";
import { POST as ask } from "@/app/api/ask/route";
import { GET as health } from "@/app/api/health/route";
import { GET as places } from "@/app/api/places/route";
import { POST as plan } from "@/app/api/plan/route";
import { airReport } from "@/lib/air/report";
import { searchPlaces } from "@/lib/air/open-meteo";
import { groqKey, openAqKey } from "@/lib/server/config";
import { planRequest, report } from "../support/fixtures";

vi.mock("@/lib/air/report", () => ({ airReport: vi.fn() }));
vi.mock("@/lib/air/open-meteo", () => ({ searchPlaces: vi.fn() }));

const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "3.3.3.3" },
    body: JSON.stringify(body),
  });

describe("API routes", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "");
  });

  it("reports health and which optional services are on, without secrets", async () => {
    expect(await health().json()).toEqual({ ok: true, ai: null, stations: false });
    vi.stubEnv("GROQ_API_KEY", "gsk-test");
    vi.stubEnv("OPENAQ_API_KEY", " key ");
    expect(await health().json()).toEqual({ ok: true, ai: "groq", stations: true });
    expect(groqKey()).toBe("gsk-test");
    expect(openAqKey()).toBe("key");
  });

  it("serves air for rounded coordinates inside India", async () => {
    vi.mocked(airReport).mockResolvedValue(report());
    const response = await air(new Request("http://localhost/api/air?lat=28.6139&lon=77.209"));
    expect(response.status).toBe(200);
    expect(airReport).toHaveBeenCalledWith({ latitude: 28.61, longitude: 77.21 });
  });

  it("searches places", async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    const response = await places(new Request("http://localhost/api/places?q=Pune"));
    expect(await response.json()).toEqual({ places: [] });
    expect(searchPlaces).toHaveBeenCalledWith("Pune");
  });

  it("builds the built-in plan and answer when AI is off", async () => {
    const planned = await (await plan(post("/api/plan", planRequest()))).json();
    expect(planned.source).toBe("fallback");
    expect(planned.data.plan.headline).toContain("New Delhi");
    const answered = await (
      await ask(post("/api/ask", { ...planRequest(), question: "Park today?" }))
    ).json();
    expect(answered.data.answer).toContain("general guidance");
  });
});
