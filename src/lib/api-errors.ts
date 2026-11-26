// Error codes shared by the API routes and the browser. The server sends only
// a code, never free text, so nothing about the request or the model leaks, and
// the browser words every message in the reader's language (src/lib/i18n).

import * as z from "./zod";

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

/** Server side: the response for a failure, carrying only its code. */
export function errorResponse(code: keyof typeof STATUS_FOR, headers?: HeadersInit): Response {
  return Response.json({ error: code }, { status: STATUS_FOR[code], headers });
}
