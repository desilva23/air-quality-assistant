import { beforeEach, describe, expect, it, vi } from "vitest";
import { dataRoute } from "@/lib/server/data-route";
import * as z from "@/lib/zod";
import { rejection } from "../support/fetch";

const get = (query: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/thing?${query}`, {
    headers: { "x-forwarded-for": "192.0.2.2", ...headers },
  });

function route(run: (input: { q: string }) => Promise<{ items: string[] }>) {
  return dataRoute({
    name: "thing",
    query: z.object({ q: z.string().check(z.minLength(2)) }),
    output: z.object({ items: z.array(z.string()) }),
    run,
    ttlMs: 60_000,
  });
}

describe("dataRoute", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("validates the query, answers and caches", async () => {
    const run = vi.fn(async ({ q }: { q: string }) => ({ items: [q] }));
    const GET = route(run);
    const first = await GET(get("q=Noida"));
    expect(await first.json()).toEqual({ items: ["Noida"] });
    expect(first.headers.get("Cache-Control")).toBe("no-store");
    expect((await GET(get("q=Noida"))).headers.get("X-Cache")).toBe("HIT");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("refuses a bad query and other sites", async () => {
    const GET = route(async () => ({ items: [] }));
    const bad = await GET(get("q=N"));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "INVALID_INPUT" });
    expect(
      (await GET(get("q=Noida", { origin: "https://evil.example", host: "localhost" }))).status,
    ).toBe(403);
  });

  it("says the data is unavailable when the source fails, logging the safe reason", async () => {
    const failing = await route(() => Promise.reject(new Error("Open-Meteo returned 500")))(
      get("q=Pune"),
    );
    expect(failing.status).toBe(503);
    expect(await failing.json()).toEqual({ error: "DATA_UNAVAILABLE" });
    expect(console.error).toHaveBeenCalledWith("[data:thing] Open-Meteo returned 500");
    await route(() => rejection())(get("q=Agra"));
    expect(console.error).toHaveBeenCalledWith("[data:thing] UnknownError");
  });
});
