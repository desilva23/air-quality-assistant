import { describe, expect, it } from "vitest";
import { fetchJson, UpstreamError, urlWith } from "@/lib/air/fetch-json";
import * as z from "@/lib/zod";
import { json, rejection, stubFetch } from "../support/fetch";

const schema = z.object({ ok: z.boolean() });
const url = urlWith("https://example.test/data", { a: "1" });

describe("fetchJson", () => {
  it("builds query strings", () => {
    expect(url.toString()).toBe("https://example.test/data?a=1");
  });

  it("returns a validated reply and passes headers", async () => {
    const fetch = stubFetch(() => json({ ok: true }));
    await expect(
      fetchJson(url, schema, { source: "Test", headers: { "X-Key": "k" } }),
    ).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0]?.[1]?.headers).toEqual({ "X-Key": "k" });
  });

  it("names the provider and the status when it fails", async () => {
    stubFetch(() => json({}, 503));
    await expect(fetchJson(url, schema, { source: "Test" })).rejects.toThrow("Test returned 503");
  });

  it("rejects a reply of the wrong shape, or one that isn't JSON", async () => {
    stubFetch(() => json({ ok: "yes" }));
    await expect(fetchJson(url, schema, { source: "Test" })).rejects.toThrow(
      "Test sent an unexpected reply",
    );
    stubFetch(() => new Response("<html>"));
    await expect(fetchJson(url, schema, { source: "Test" })).rejects.toBeInstanceOf(UpstreamError);
  });

  it("reports an unreachable provider by error name only", async () => {
    stubFetch(() => Promise.reject(new TypeError("fetch failed: secret detail")));
    await expect(fetchJson(url, schema, { source: "Test" })).rejects.toThrow(
      "Test unreachable (TypeError)",
    );
    stubFetch(() => rejection());
    await expect(fetchJson(url, schema, { source: "Test" })).rejects.toThrow(
      "Test unreachable (UnknownError)",
    );
  });
});
