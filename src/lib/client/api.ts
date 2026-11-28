"use client";

// The only way the browser talks to the API. Each endpoint gets one typed
// function: a wrong request fails to compile, and a reply that doesn't match
// the endpoint's schema is rejected here as well as checked on the server.

import { useCallback, useEffect, useRef, useState } from "react";
import type * as z from "../zod";
import { AirReportSchema, type AirReport } from "../domain/air";
import { roundCoordinate, type Coordinates } from "../domain/geo";
import {
  PlacesReplySchema,
  StationsReplySchema,
  type PlacesQuery,
  type PlacesReply,
  type StationsReply,
} from "../air/contracts";
import {
  AnswerEnvelopeSchema,
  PlanEnvelopeSchema,
  type AiEnvelope,
  type Answer,
  type AskRequest,
  type PlanReply,
  type PlanRequest,
} from "../ai/contracts";
import { ApiErrorBodySchema, type ApiErrorCode } from "../api-errors";

/** Data lookups answer within seconds; AI calls get a little longer than the server's model timeout. */
const DATA_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 35_000;

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode) {
    // The code is the message; the interface words it in the reader's language.
    super(code);
    this.name = "ApiError";
    this.code = code;
  }
}

export interface RequestOptions {
  /** Aborts the request when the caller no longer needs it. */
  signal?: AbortSignal;
  /** Injected by tests; the global fetch otherwise. */
  fetcher?: typeof fetch;
}

function failureCode(error: unknown, signal: AbortSignal | undefined): ApiErrorCode {
  if (error instanceof ApiError) return error.code;
  if (error instanceof DOMException && error.name === "TimeoutError") return "TIMEOUT";
  if (signal?.aborted) return "CANCELLED";
  return "NETWORK";
}

interface Call<S extends z.ZodMiniType> {
  path: string;
  schema: S;
  timeoutMs: number;
  /** A JSON body makes this a POST; without one it is a GET. */
  body?: unknown;
}

async function request<S extends z.ZodMiniType>(
  { path, schema, timeoutMs, body }: Call<S>,
  { signal, fetcher = fetch }: RequestOptions = {},
): Promise<z.infer<S>> {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetcher(path, {
      ...(body !== undefined && {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const failure = ApiErrorBodySchema.safeParse(data);
      throw new ApiError(failure.success ? failure.data.error : "INTERNAL");
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new ApiError("RESPONSE_INVALID");
    return parsed.data;
  } catch (error) {
    throw new ApiError(failureCode(error, signal));
  }
}

// --- Endpoints: one function per route, typed by its own schemas ------------

export function searchPlaces(query: PlacesQuery, options?: RequestOptions): Promise<PlacesReply> {
  const path = `/api/places?${new URLSearchParams({ q: query.q }).toString()}`;
  return request({ path, schema: PlacesReplySchema, timeoutMs: DATA_TIMEOUT_MS }, options);
}

/** A point as a query string, rounded so nearby visitors share the server's cache entry. */
function pointQuery({ latitude, longitude }: Coordinates): string {
  const lat = String(roundCoordinate(latitude));
  return new URLSearchParams({ lat, lon: String(roundCoordinate(longitude)) }).toString();
}

export function fetchAir(point: Coordinates, options?: RequestOptions): Promise<AirReport> {
  const path = `/api/air?${pointQuery(point)}`;
  return request({ path, schema: AirReportSchema, timeoutMs: DATA_TIMEOUT_MS }, options);
}

export function fetchStations(
  point: Coordinates,
  options?: RequestOptions,
): Promise<StationsReply> {
  const path = `/api/stations?${pointQuery(point)}`;
  return request({ path, schema: StationsReplySchema, timeoutMs: DATA_TIMEOUT_MS }, options);
}

export function requestPlan(
  input: PlanRequest,
  options?: RequestOptions,
): Promise<AiEnvelope<PlanReply>> {
  return request(
    { path: "/api/plan", schema: PlanEnvelopeSchema, timeoutMs: AI_TIMEOUT_MS, body: input },
    options,
  );
}

export function askQuestion(
  input: AskRequest,
  options?: RequestOptions,
): Promise<AiEnvelope<Answer>> {
  return request(
    { path: "/api/ask", schema: AnswerEnvelopeSchema, timeoutMs: AI_TIMEOUT_MS, body: input },
    options,
  );
}

// --- Calling an endpoint from a component -----------------------------------

export type CallStatus = "idle" | "loading" | "done" | "error";

interface CallState<O> {
  status: CallStatus;
  data?: O;
  error?: ApiErrorCode;
}

/**
 * Runs one endpoint function with loading and error state. A new run cancels
 * the one in flight, and unmounting cancels it too, so a slow old answer can
 * never overwrite a newer one. The last good result survives a failed retry.
 * Pass a module-level endpoint function, so `run` stays stable.
 */
export function useApiCall<I, O>(call: (input: I, options: RequestOptions) => Promise<O>) {
  const [state, setState] = useState<CallState<O>>({ status: "idle" });
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    const pending = inFlight;
    return () => {
      pending.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (input: I): Promise<O | null> => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setState((previous) => ({ status: "loading", data: previous.data }));
      try {
        const data = await call(input, { signal: controller.signal });
        setState({ status: "done", data });
        return data;
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "INTERNAL";
        if (code !== "CANCELLED") {
          setState((previous) => ({ status: "error", error: code, data: previous.data }));
        }
        return null;
      }
    },
    [call],
  );

  const reset = useCallback(() => {
    inFlight.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { ...state, loading: state.status === "loading", run, reset };
}
