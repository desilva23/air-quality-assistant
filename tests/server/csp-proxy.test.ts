import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/lib/server/csp";
import { config, proxy } from "@/proxy";

describe("Content-Security-Policy", () => {
  it("allows only nonce-bearing scripts and this site's own connections in production", () => {
    const policy = contentSecurityPolicy("abc", false);
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(policy).toContain("style-src 'self' 'nonce-abc'");
    expect(policy).toContain("connect-src 'self';");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("img-src 'self' data: https://tile.openstreetmap.org");
    expect(policy).not.toContain("unsafe");
  });

  it("relaxes only what the development server needs", () => {
    const policy = contentSecurityPolicy("abc", true);
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("connect-src 'self' ws:");
  });
});

describe("proxy", () => {
  it("gives every page request a fresh nonce, on the request and the response", () => {
    const first = proxy(new NextRequest("http://localhost/"));
    const second = proxy(new NextRequest("http://localhost/"));
    const policy = first.headers.get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
    expect(nonce).toBeTruthy();
    expect(second.headers.get("Content-Security-Policy")).not.toBe(policy);
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });

  it("skips API routes, static files and prefetches", () => {
    expect(config.matcher[0]?.source).toContain("?!api|_next/static");
    expect(config.matcher[0]?.missing).toHaveLength(2);
  });
});
