import { describe, expect, it } from "vitest";
import { groqKey, openAqKey, redisCredentials, trustedProxyHops } from "@/lib/server/config";

describe("server settings", () => {
  it("reads the API keys, treating blank values as unset", () => {
    expect(groqKey({ GROQ_API_KEY: " gsk_test " })).toBe("gsk_test");
    expect(groqKey({ GROQ_API_KEY: "  " })).toBeNull();
    expect(openAqKey({ OPENAQ_API_KEY: "oaq" })).toBe("oaq");
    expect(openAqKey({})).toBeNull();
  });

  it("finds Redis under Upstash's names or the names Vercel's integration sets", () => {
    const credentials = { url: "https://r.example", token: "t" };
    expect(
      redisCredentials({
        UPSTASH_REDIS_REST_URL: "https://r.example",
        UPSTASH_REDIS_REST_TOKEN: "t",
      }),
    ).toEqual(credentials);
    expect(
      redisCredentials({ KV_REST_API_URL: "https://r.example", KV_REST_API_TOKEN: "t" }),
    ).toEqual(credentials);
  });

  it("doesn't let a blank variable hide one set under the other name", () => {
    expect(
      redisCredentials({
        UPSTASH_REDIS_REST_URL: "",
        KV_REST_API_URL: "https://r.example",
        KV_REST_API_TOKEN: "t",
      }),
    ).toEqual({ url: "https://r.example", token: "t" });
  });

  it("uses memory unless both the Redis URL and token are set", () => {
    expect(redisCredentials({ KV_REST_API_URL: "https://r.example" })).toBeNull();
    expect(redisCredentials({})).toBeNull();
  });

  it("reads TRUSTED_PROXY_HOPS as a whole number of at least one", () => {
    expect(trustedProxyHops({})).toBe(1);
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: "2" })).toBe(2);
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: "0" })).toBe(1);
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: "abc" })).toBe(1);
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: " " })).toBe(1);
  });
});
