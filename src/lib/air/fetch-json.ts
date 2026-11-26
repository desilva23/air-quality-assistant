import "server-only";
import type { z } from "zod";

/** A data provider failed or replied with something unexpected. The message is safe to log. */
export class UpstreamError extends Error {
  override name = "UpstreamError";
}

const UPSTREAM_TIMEOUT_MS = 6000;

interface FetchOptions {
  /** Names the provider in error messages. */
  source: string;
  headers?: Record<string, string>;
}

/** GETs JSON from a data provider and validates it against `schema`. */
export async function fetchJson<S extends z.ZodType>(
  url: URL,
  schema: S,
  { source, headers }: FetchOptions,
): Promise<z.infer<S>> {
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "UnknownError";
    throw new UpstreamError(`${source} unreachable (${reason})`);
  }
  if (!response.ok) throw new UpstreamError(`${source} returned ${response.status}`);
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new UpstreamError(`${source} sent an unexpected reply`);
  return parsed.data;
}

/** A URL with its query string built from `params`. */
export function urlWith(base: string, params: Record<string, string>): URL {
  const url = new URL(base);
  url.search = new URLSearchParams(params).toString();
  return url;
}
