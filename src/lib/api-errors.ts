// Error codes shared by the API routes and the browser. The server sends only
// a code, never free text, so nothing about the request or the model leaks, and
// the client owns every message the user reads.

import { z } from "./zod";

const API_ERROR_CODES = [
  // Sent by the server.
  "CROSS_SITE",
  "UNSUPPORTED_MEDIA_TYPE",
  "TOO_LARGE",
  "INVALID_INPUT",
  "RATE_LIMITED",
  "DATA_UNAVAILABLE",
  "INTERNAL",
  // Raised only in the browser.
  "RESPONSE_INVALID",
  "TIMEOUT",
  "CANCELLED",
  "NETWORK",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorBodySchema = z.object({ error: z.enum(API_ERROR_CODES) });

/** HTTP status for each code the server sends. */
export const STATUS_FOR = {
  CROSS_SITE: 403,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_LARGE: 413,
  INVALID_INPUT: 400,
  RATE_LIMITED: 429,
  DATA_UNAVAILABLE: 503,
  INTERNAL: 500,
} as const satisfies Partial<Record<ApiErrorCode, number>>;

export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  CROSS_SITE: "This request has to come from the app itself.",
  UNSUPPORTED_MEDIA_TYPE: "The app sent something the server can't read. Reload and try again.",
  TOO_LARGE: "That request is too long. Shorten your question and try again.",
  INVALID_INPUT: "Some details are missing or out of range. Check them and try again.",
  RATE_LIMITED: "Too many requests in a short time. Wait a minute and try again.",
  DATA_UNAVAILABLE: "Live air data couldn't be fetched just now. Try again in a minute.",
  INTERNAL: "Something went wrong on our side. Try again.",
  RESPONSE_INVALID: "The server sent an answer we couldn't trust. Try again.",
  TIMEOUT: "The server took too long to answer. Try again.",
  CANCELLED: "The request was cancelled.",
  NETWORK: "Couldn't reach the server. Check your connection and try again.",
};

/** Server side: the response for a failure, carrying only its code. */
export function errorResponse(code: keyof typeof STATUS_FOR, headers?: HeadersInit): Response {
  return Response.json({ error: code }, { status: STATUS_FOR[code], headers });
}
