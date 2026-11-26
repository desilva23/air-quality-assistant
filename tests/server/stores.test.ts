import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { createStores } from "@/lib/server/stores";
import { createTtlCache } from "@/lib/server/ttl-cache";
import { z } from "@/lib/zod";
import { bodyOf, json, rejection, stubFetch } from "../support/fetch";

const options = {
  name: "test",
  limit: 2,
  windowMs: 60_000,
  ttlMs: 1000,
  maxEntries: 2,
  schema: z.object({ n: z.number() }),
};
const redisEnv = { KV_REST_API_URL: "https://redis.example/", KV_REST_API_TOKEN: "token" };

describe("in-memory rate limiter", () => {
  it("allows the limit per window, then says how long to wait", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.check("a", 0)).toEqual({ ok: true });
    expect(limiter.check("a", 100)).toEqual({ ok: true });
    expect(limiter.check("a", 200)).toEqual({ ok: false, retryAfterSeconds: 1 });
    expect(limiter.check("b", 200)).toEqual({ ok: true });
    expect(limiter.check("a", 1100)).toEqual({ ok: true });
  });

  it("waits a full window when the limit is zero", () => {
    expect(createRateLimiter({ limit: 0, windowMs: 5000 }).check("a", 0)).toEqual({
      ok: false,
      retryAfterSeconds: 5,
    });
  });

  it("forgets idle clients once it tracks too many", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10 });
    for (let i = 0; i <= 10_000; i++) limiter.check(`client-${String(i)}`, 0);
    expect(limiter.size).toBe(10_001);
    limiter.check("late", 100);
    expect(limiter.size).toBe(1);
    expect(createRateLimiter({ limit: 1, windowMs: 10 }).check("now")).toEqual({ ok: true });
  });
});

describe("in-memory cache", () => {
  it("expires entries and evicts the oldest when full", () => {
    const cache = createTtlCache<number>({ maxEntries: 2, ttlMs: 100 });
    cache.set("a", 1, 0);
    cache.set("b", 2, 0);
    cache.set("c", 3, 0);
    expect(cache.get("a", 50)).toBeUndefined();
    expect(cache.get("b", 50)).toBe(2);
    expect(cache.get("c", 100)).toBeUndefined();
    cache.set("d", 4);
    expect(cache.get("d")).toBe(4);
  });
});

describe("createStores without Redis", () => {
  it("keeps limits and answers in memory", async () => {
    const { limiter, cache } = createStores(options, {});
    expect(await limiter.check("a")).toEqual({ ok: true });
    await cache.set("k", { n: 1 });
    expect(await cache.get("k")).toEqual({ n: 1 });
  });
});

describe("createStores with Upstash Redis", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("counts per hashed client and window in one round trip", async () => {
    const fetch = stubFetch(() => json([{ result: 3 }, { result: 1 }]));
    const { limiter } = createStores(options, redisEnv, () => 90_000);
    expect(await limiter.check("1.2.3.4")).toEqual({ ok: false, retryAfterSeconds: 30 });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://redis.example/pipeline");
    expect(init?.headers).toEqual({ Authorization: "Bearer token" });
    const commands = bodyOf(init) as string[][];
    expect(commands[0]?.[1]).toMatch(/^aqa:test:rate:[0-9a-f]{32}:1$/);
    expect(JSON.stringify(commands)).not.toContain("1.2.3.4");
  });

  it("allows requests under the limit", async () => {
    stubFetch(() => json([{ result: 1 }, { result: 1 }]));
    expect(await createStores(options, redisEnv).limiter.check("a")).toEqual({ ok: true });
  });

  it("stores answers with an expiry and validates what it reads back", async () => {
    const fetch = stubFetch((_, init) => {
      const command = (bodyOf(init) as string[][])[0]?.[0];
      return json([{ result: command === "GET" ? JSON.stringify({ n: 7 }) : "OK" }]);
    });
    const { cache } = createStores(options, {
      UPSTASH_REDIS_REST_URL: "https://r.example",
      UPSTASH_REDIS_REST_TOKEN: "t",
    });
    await cache.set("k", { n: 7 });
    expect(bodyOf(fetch.mock.calls[0]?.[1])).toEqual([
      ["SET", "aqa:test:cache:k", '{"n":7}', "PX", 1000],
    ]);
    expect(await cache.get("k")).toEqual({ n: 7 });
  });

  it("treats a missing or malformed cached value as a miss", async () => {
    stubFetch(() => json([{ result: null }]));
    expect(await createStores(options, redisEnv).cache.get("k")).toBeUndefined();
    stubFetch(() => json([{ result: '{"n":"seven"}' }]));
    expect(await createStores(options, redisEnv).cache.get("k")).toBeUndefined();
  });

  it("keeps the app running when Redis fails, and logs why", async () => {
    stubFetch(() => json({}, 500));
    const stores = createStores(options, redisEnv);
    expect(await stores.limiter.check("a")).toEqual({ ok: true });
    expect(await stores.cache.get("k")).toBeUndefined();
    await expect(stores.cache.set("k", { n: 1 })).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "[store] rate limit check failed, request allowed: Upstash returned 500",
    );

    stubFetch(() => json([{ error: "WRONGTYPE" }]));
    await stores.cache.get("k");
    expect(console.error).toHaveBeenCalledWith(
      "[store] cache read failed: Upstash command failed: WRONGTYPE",
    );

    stubFetch(() => rejection());
    await stores.cache.get("k");
    expect(console.error).toHaveBeenCalledWith("[store] cache read failed: UnknownError");
  });
});
