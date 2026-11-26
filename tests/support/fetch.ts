import { vi } from "vitest";

/** A JSON Response, as fetch would return it. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type Responder = (url: string, init?: RequestInit) => Response | Promise<Response>;

/**
 * Replaces the global fetch. Each call is answered by `respond`; the returned
 * mock records calls with the URL as a string.
 */
export function stubFetch(respond: Responder) {
  const mock = vi.fn((url: string, init?: RequestInit) => Promise.resolve(respond(url, init)));
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) =>
    mock(input instanceof Request ? input.url : input.toString(), init),
  );
  return mock;
}

/** The JSON body a recorded call sent. */
export function bodyOf(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

/** A rejection with something that isn't an Error, as some libraries throw. */
export async function rejection(reason: unknown = Object.create(null)): Promise<never> {
  throw reason;
}
