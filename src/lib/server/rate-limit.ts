// Sliding-window limiter held in memory, used when no shared store is set up.
// It is per server instance; with Upstash Redis configured, stores.ts shares
// the count across instances instead.

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Clients tracked before idle ones are forgotten. */
const MAX_TRACKED = 10_000;

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  function forgetIdle(now: number): void {
    for (const [key, times] of hits) {
      if (now - Math.max(...times) >= windowMs) hits.delete(key);
    }
  }

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        // With a limit of zero there is no oldest request, so wait a full window.
        const oldest = recent[0] ?? now;
        return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - oldest)) / 1000) };
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > MAX_TRACKED) forgetIdle(now);
      return { ok: true };
    },
    get size() {
      return hits.size;
    },
  };
}
