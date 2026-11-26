import "server-only";
import { errorResponse } from "../api-errors";
import type { RateLimiter } from "./stores";

/** API responses are personal and change by the minute, so nothing in between may keep them. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/** TRUSTED_PROXY_HOPS as a whole number of at least 1; anything else means 1. */
export function trustedProxyHops(env: Record<string, string | undefined> = process.env): number {
  const hops = Number(env.TRUSTED_PROXY_HOPS ?? 1);
  return Number.isInteger(hops) ? Math.max(1, hops) : 1;
}

/**
 * The client's address, for rate limiting. Each proxy appends the address it
 * received the request from to X-Forwarded-For, so only the right-most entries
 * were written by infrastructure; anything to their left came from the client
 * and can be forged. `hops` counts back from the right: 1 on Vercel.
 */
export function clientKey(request: Request, hops: number = trustedProxyHops()): string {
  const chain = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return chain[Math.max(0, chain.length - hops)] ?? request.headers.get("x-real-ip") ?? "anonymous";
}

/** Rejects browser requests from other sites, so they can't spend this server's quotas. */
export function fromThisSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return URL.parse(origin)?.host === host;
}

/** A refusal for a cross-site or over-limit request, or null to carry on. */
export async function refusal(request: Request, limiter: RateLimiter): Promise<Response | null> {
  if (!fromThisSite(request)) return errorResponse("CROSS_SITE", NO_STORE);
  const limit = await limiter.check(clientKey(request));
  if (limit.ok) return null;
  return errorResponse("RATE_LIMITED", {
    ...NO_STORE,
    "Retry-After": String(limit.retryAfterSeconds),
  });
}

/**
 * Reads the body but gives up once it passes `limit` bytes, so a request that
 * doesn't declare its size can't make the server buffer an unbounded upload.
 * Null means too large.
 */
export async function readLimitedBody(request: Request, limit: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > limit) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    size += next.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(next.value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** A JSON response that intermediaries won't store, optionally marked as a cache hit. */
export function jsonResponse(body: unknown, { cached = false } = {}): Response {
  return Response.json(body, { headers: { ...NO_STORE, ...(cached && { "X-Cache": "HIT" }) } });
}
