import "server-only";

type Env = Record<string, string | undefined>;

/** A set, non-blank variable, or null. */
function secret(env: Env, name: string): string | null {
  const value = env[name]?.trim();
  if (!value) return null;
  return value;
}

/** The Groq key, when AI is switched on for this server. */
export function groqKey(env: Env = process.env): string | null {
  return secret(env, "GROQ_API_KEY");
}

/** The OpenAQ key, when measured station readings are switched on. */
export function openAqKey(env: Env = process.env): string | null {
  return secret(env, "OPENAQ_API_KEY");
}
