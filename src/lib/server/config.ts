import "server-only";

// The only module that reads the environment. One rule for every variable: a
// blank or whitespace value counts as unset, so an empty field in a dashboard
// can't switch a feature off or hide a value set under another name.

type Env = Record<string, string | undefined>;

/** A set, non-blank variable, or null. */
function setting(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  // Not `?? null`: that would keep "".
  if (!value) return null;
  return value;
}

/** The Groq key, when AI is switched on for this server. */
export function groqKey(env: Env = process.env): string | null {
  return setting(env, "GROQ_API_KEY");
}

/** The OpenAQ key, when measured station readings are switched on. */
export function openAqKey(env: Env = process.env): string | null {
  return setting(env, "OPENAQ_API_KEY");
}

export interface RedisCredentials {
  url: string;
  token: string;
}

/**
 * Upstash Redis's REST URL and token, when both are set. Vercel's Upstash
 * integration names them KV_REST_API_URL and KV_REST_API_TOKEN; Upstash's own
 * console uses the UPSTASH_ names.
 */
export function redisCredentials(env: Env = process.env): RedisCredentials | null {
  const url = setting(env, "UPSTASH_REDIS_REST_URL") ?? setting(env, "KV_REST_API_URL");
  const token = setting(env, "UPSTASH_REDIS_REST_TOKEN") ?? setting(env, "KV_REST_API_TOKEN");
  return url && token ? { url, token } : null;
}

/** TRUSTED_PROXY_HOPS as a whole number of at least 1; anything else means 1, right for Vercel. */
export function trustedProxyHops(env: Env = process.env): number {
  const hops = Number(setting(env, "TRUSTED_PROXY_HOPS") ?? 1);
  return Number.isInteger(hops) ? Math.max(1, hops) : 1;
}
