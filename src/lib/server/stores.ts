import "server-only";
import { createHash } from "node:crypto";
import * as z from "../zod";
import { redisCredentials, type RedisCredentials } from "./config";
import { createRateLimiter, type RateLimitResult } from "./rate-limit";
import { createTtlCache } from "./ttl-cache";

// Where rate-limit counts and cached answers live. In memory by default, which
// is per server instance. With Upstash Redis configured they are shared, so
// limits hold however many instances are running.

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export interface ResponseCache<V> {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V): Promise<void>;
}

export interface StoreOptions<V> {
  /** Namespaces this store's keys in Redis. */
  name: string;
  /** Requests allowed per client per window. */
  limit: number;
  windowMs: number;
  /** How long an identical request is answered from the cache. */
  ttlMs: number;
  /** In-memory cache size; Redis expires entries by time alone. */
  maxEntries: number;
  /** Checks values read back from Redis, which is outside this process. */
  schema: z.ZodMiniType<V>;
}

type Command = (string | number)[];
type RunCommands = (commands: Command[]) => Promise<unknown[]>;

const REDIS_TIMEOUT_MS = 1500;

const PipelineReplySchema = z.array(
  z.object({ result: z.optional(z.unknown()), error: z.optional(z.string()) }),
);

/** Sends Redis commands to Upstash's REST API in one round trip. */
function upstash({ url, token }: RedisCredentials): RunCommands {
  return async (commands) => {
    const response = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(REDIS_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Upstash returned ${response.status}`);
    const replies = PipelineReplySchema.parse(await response.json());
    const failed = replies.find((reply) => reply.error);
    if (failed) throw new Error(`Upstash command failed: ${String(failed.error)}`);
    return replies.map((reply) => reply.result);
  };
}

/** Store failures are logged and then ignored, so Redis being down never takes the app down. */
function logStoreError(action: string, error: unknown): void {
  console.error(`[store] ${action}: ${error instanceof Error ? error.message : "UnknownError"}`);
}

/** Fixed-window counter per client. Addresses are hashed before they leave the server. */
function redisRateLimiter<V>(run: RunCommands, options: StoreOptions<V>, now: () => number) {
  const { name, limit, windowMs } = options;
  return {
    async check(key: string): Promise<RateLimitResult> {
      const time = now();
      const window = Math.floor(time / windowMs);
      const client = createHash("sha256").update(key).digest("hex").slice(0, 32);
      const redisKey = `aqa:${name}:rate:${client}:${String(window)}`;
      try {
        const [count] = await run([
          ["INCR", redisKey],
          ["PEXPIRE", redisKey, windowMs],
        ]);
        if (Number(count) <= limit) return { ok: true };
        return { ok: false, retryAfterSeconds: Math.ceil(((window + 1) * windowMs - time) / 1000) };
      } catch (error) {
        logStoreError("rate limit check failed, request allowed", error);
        return { ok: true };
      }
    },
  };
}

function redisCache<V>(run: RunCommands, { name, ttlMs, schema }: StoreOptions<V>) {
  const keyFor = (key: string): string => `aqa:${name}:cache:${key}`;
  return {
    async get(key: string): Promise<V | undefined> {
      try {
        const [value] = await run([["GET", keyFor(key)]]);
        if (typeof value !== "string") return undefined;
        const parsed = schema.safeParse(JSON.parse(value));
        return parsed.success ? parsed.data : undefined;
      } catch (error) {
        logStoreError("cache read failed", error);
        return undefined;
      }
    },
    async set(key: string, value: V): Promise<void> {
      try {
        await run([["SET", keyFor(key), JSON.stringify(value), "PX", ttlMs]]);
      } catch (error) {
        logStoreError("cache write failed", error);
      }
    },
  };
}

function memoryStores<V>(options: StoreOptions<V>) {
  const limiter = createRateLimiter(options);
  const cache = createTtlCache<V>(options);
  return {
    limiter: { check: async (key: string) => limiter.check(key) },
    cache: {
      get: async (key: string) => cache.get(key),
      set: async (key: string, value: V) => {
        cache.set(key, value);
      },
    },
  };
}

/** Upstash Redis when it is configured, memory otherwise. */
export function createStores<V>(
  options: StoreOptions<V>,
  redis: RedisCredentials | null = redisCredentials(),
  now: () => number = Date.now,
): { limiter: RateLimiter; cache: ResponseCache<V> } {
  if (!redis) return memoryStores(options);
  const run = upstash(redis);
  return { limiter: redisRateLimiter(run, options, now), cache: redisCache(run, options) };
}
