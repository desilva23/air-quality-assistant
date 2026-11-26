import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ApiError,
  askQuestion,
  fetchAir,
  requestPlan,
  searchPlaces,
  useApiCall,
} from "@/lib/client/api";
import { planFallback } from "@/lib/ai/fallbacks/plan";
import { json } from "../support/fetch";
import { planRequest, report } from "../support/fixtures";

const fetcherReturning = (response: Response | Promise<Response>) =>
  vi.fn<typeof fetch>(() => Promise.resolve(response));

describe("endpoint functions", () => {
  it("search places with a GET and validate the reply", async () => {
    const fetcher = fetcherReturning(json({ places: [] }));
    await expect(searchPlaces({ q: "Pune" }, { fetcher })).resolves.toEqual({ places: [] });
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/places?q=Pune");
    expect(fetcher.mock.calls[0]?.[1]?.method).toBeUndefined();
  });

  it("round coordinates before asking for air", async () => {
    const fetcher = fetcherReturning(json(report()));
    await expect(
      fetchAir({ latitude: 28.61394, longitude: 77.20902 }, { fetcher }),
    ).resolves.toEqual(report());
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/air?lat=28.61&lon=77.21");
  });

  it("post plan requests and questions as JSON", async () => {
    const envelope = { source: "fallback", data: planFallback(planRequest()) };
    const fetcher = fetcherReturning(json(envelope));
    await expect(requestPlan(planRequest(), { fetcher })).resolves.toEqual(envelope);
    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "content-type": "application/json" });
    const answer = { source: "ai", data: { answer: "Yes", tips: [] } };
    await expect(
      askQuestion(
        { ...planRequest(), question: "Ok?" },
        { fetcher: fetcherReturning(json(answer)) },
      ),
    ).resolves.toEqual(answer);
  });
});

describe("failures", () => {
  const codeOf = (promise: Promise<unknown>) =>
    promise.catch((error: unknown) => error instanceof ApiError && error.code);

  it("map the server's error code, or INTERNAL when there isn't one", async () => {
    expect(
      await codeOf(
        searchPlaces(
          { q: "Pune" },
          { fetcher: fetcherReturning(json({ error: "RATE_LIMITED" }, 429)) },
        ),
      ),
    ).toBe("RATE_LIMITED");
    expect(
      await codeOf(
        searchPlaces(
          { q: "Pune" },
          { fetcher: fetcherReturning(new Response("oops", { status: 500 })) },
        ),
      ),
    ).toBe("INTERNAL");
  });

  it("reject a reply that doesn't match the endpoint's schema", async () => {
    expect(
      await codeOf(
        fetchAir(
          { latitude: 28, longitude: 77 },
          { fetcher: fetcherReturning(json({ reading: "?" })) },
        ),
      ),
    ).toBe("RESPONSE_INVALID");
  });

  it("tell timeouts, cancellations and network failures apart", async () => {
    const timeout = vi.fn<typeof fetch>(() =>
      Promise.reject(new DOMException("slow", "TimeoutError")),
    );
    expect(await codeOf(searchPlaces({ q: "Pune" }, { fetcher: timeout }))).toBe("TIMEOUT");
    const controller = new AbortController();
    controller.abort();
    const aborted = vi.fn<typeof fetch>(() =>
      Promise.reject(new DOMException("stop", "AbortError")),
    );
    expect(
      await codeOf(searchPlaces({ q: "Pune" }, { fetcher: aborted, signal: controller.signal })),
    ).toBe("CANCELLED");
    const offline = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await codeOf(searchPlaces({ q: "Pune" }, { fetcher: offline }))).toBe("NETWORK");
  });

  it("use the global fetch by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(json({ places: [] }))),
    );
    await expect(searchPlaces({ q: "Pune" })).resolves.toEqual({ places: [] });
  });
});

describe("useApiCall", () => {
  it("tracks loading, success and errors, keeping the last good result", async () => {
    const call = vi.fn<(input: string) => Promise<string>>();
    call
      .mockResolvedValueOnce("first")
      .mockRejectedValueOnce(new ApiError("RATE_LIMITED"))
      .mockRejectedValueOnce(new Error("odd"));
    const { result } = renderHook(() => useApiCall(call));
    expect(result.current.status).toBe("idle");
    await act(() => result.current.run("a"));
    expect(result.current).toMatchObject({ status: "done", data: "first", loading: false });
    await act(() => result.current.run("b"));
    expect(result.current).toMatchObject({
      status: "error",
      data: "first",
      error: "RATE_LIMITED",
    });
    await act(() => result.current.run("c"));
    expect(result.current.error).toBe("INTERNAL");
    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
  });

  it("cancels the call in flight when a new one starts, and ignores the cancellation", async () => {
    const signals: AbortSignal[] = [];
    const call = vi.fn((input: string, { signal }: { signal?: AbortSignal }) => {
      if (signal) signals.push(signal);
      return input === "slow"
        ? new Promise<string>((_, reject) =>
            signal?.addEventListener("abort", () => reject(new ApiError("CANCELLED"))),
          )
        : Promise.resolve(input);
    });
    const { result, unmount } = renderHook(() => useApiCall(call));
    let slow: Promise<string | null> = Promise.resolve(null);
    act(() => {
      slow = result.current.run("slow");
    });
    expect(result.current.loading).toBe(true);
    await act(() => result.current.run("fast"));
    await expect(slow).resolves.toBeNull();
    expect(signals[0]?.aborted).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("fast"));
    act(() => {
      void result.current.run("slow");
    });
    unmount();
    expect(signals[2]?.aborted).toBe(true);
  });
});
