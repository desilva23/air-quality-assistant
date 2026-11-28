import { describe, expect, it } from "vitest";
import {
  clientKey,
  fromThisSite,
  jsonResponse,
  readLimitedBody,
  refusal,
} from "@/lib/server/request";

const request = (headers: Record<string, string>, body?: BodyInit) =>
  new Request("http://localhost/api/plan", { method: "POST", headers, body });

describe("client address", () => {
  it("counts proxy hops from the right, ignoring what the client wrote", () => {
    const forwarded = request({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" });
    expect(clientKey(forwarded, 1)).toBe("1.2.3.4");
    expect(clientKey(forwarded, 2)).toBe("6.6.6.6");
    expect(clientKey(forwarded, 5)).toBe("6.6.6.6");
  });

  it("falls back to x-real-ip, then a shared bucket", () => {
    expect(clientKey(request({ "x-real-ip": "9.9.9.9" }), 1)).toBe("9.9.9.9");
    expect(clientKey(request({}), 1)).toBe("anonymous");
  });

  it("trusts one proxy hop by default, as on Vercel", () => {
    expect(clientKey(request({ "x-forwarded-for": "6.6.6.6, 1.1.1.1" }))).toBe("1.1.1.1");
  });
});

describe("same-site check", () => {
  it("allows requests without an Origin and from this host", () => {
    expect(fromThisSite(request({}))).toBe(true);
    expect(fromThisSite(request({ origin: "http://localhost", host: "localhost" }))).toBe(true);
    expect(
      fromThisSite(
        request({ origin: "https://app.vercel.app", "x-forwarded-host": "app.vercel.app" }),
      ),
    ).toBe(true);
  });

  it("refuses other sites and malformed origins", () => {
    expect(fromThisSite(request({ origin: "https://evil.example", host: "localhost" }))).toBe(
      false,
    );
    expect(fromThisSite(request({ origin: "not a url", host: "localhost" }))).toBe(false);
  });
});

describe("refusal", () => {
  const open = { check: async () => ({ ok: true as const }) };
  const full = { check: async () => ({ ok: false as const, retryAfterSeconds: 42 }) };

  it("lets a same-site request under its limit through", async () => {
    expect(await refusal(request({}), open)).toBeNull();
  });

  it("answers cross-site and over-limit requests with codes only", async () => {
    const cross = await refusal(
      request({ origin: "https://evil.example", host: "localhost" }),
      open,
    );
    expect(cross?.status).toBe(403);
    expect(await cross?.json()).toEqual({ error: "CROSS_SITE" });
    const limited = await refusal(request({}), full);
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBe("42");
    expect(limited?.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("readLimitedBody", () => {
  it("reads a body within the limit", async () => {
    expect(await readLimitedBody(request({}, "hello"), 10)).toBe("hello");
    expect(await readLimitedBody(new Request("http://localhost/"), 10)).toBe("");
  });

  it("refuses a declared or streamed body over the limit", async () => {
    expect(await readLimitedBody(request({ "content-length": "999" }, "x"), 10)).toBeNull();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
        controller.close();
      },
    });
    const chunked = new Request("http://localhost/", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readLimitedBody(chunked, 10)).toBeNull();
  });
});

describe("jsonResponse", () => {
  it("is never stored by intermediaries, and marks cache hits", async () => {
    const fresh = jsonResponse({ a: 1 });
    expect(fresh.headers.get("Cache-Control")).toBe("no-store");
    expect(fresh.headers.get("X-Cache")).toBeNull();
    expect(jsonResponse({}, { cached: true }).headers.get("X-Cache")).toBe("HIT");
    expect(await fresh.json()).toEqual({ a: 1 });
  });
});
