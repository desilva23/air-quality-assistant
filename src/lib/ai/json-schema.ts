// Groq's strict structured output accepts a subset of JSON Schema. We send that
// subset (types, enums, anyOf, required, additionalProperties) and turn size
// limits into plain-language hints. The limits still hold: replies are trimmed
// to fit, then validated with Zod.

import * as z from "../zod";

type JsonObject = Record<string, unknown>;

const LIMIT_KEYS = new Set([
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
]);

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hintsFor(node: JsonObject): string[] {
  const hints: string[] = [];
  if (typeof node.maxLength === "number") hints.push(`at most ${node.maxLength} characters`);
  if (typeof node.minItems === "number" && node.minItems > 0) {
    hints.push(`at least ${node.minItems} items`);
  }
  if (typeof node.maxItems === "number") hints.push(`at most ${node.maxItems} items`);
  return hints;
}

function portable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(portable);
  return isObject(value) ? portableObject(value) : value;
}

function portableObject(value: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "$schema" || LIMIT_KEYS.has(key)) continue;
    // Keys under `properties` are field names, so a field called "format" stays.
    out[key] =
      key === "properties" && isObject(child)
        ? Object.fromEntries(Object.entries(child).map(([field, sub]) => [field, portable(sub)]))
        : portable(child);
  }
  const hints = hintsFor(value);
  if (hints.length) {
    const lead = typeof value.description === "string" ? [value.description] : [];
    out.description = [...lead, ...hints].join("; ");
  }
  return out;
}

export interface ResponseSchemas {
  /** What we send to the provider. */
  portable: JsonObject;
  /** The complete schema, used to trim replies before validation. */
  full: JsonObject;
}

export function responseSchemas(schema: z.ZodMiniType): ResponseSchemas {
  const full: JsonObject = { ...z.toJSONSchema(schema) };
  return { portable: portableObject(full), full };
}

/**
 * Trims a parsed reply to the schema's size limits: long strings are shortened
 * and extra array items dropped. Anything else is left for Zod to accept or
 * reject, so a null in a nullable field passes straight through.
 */
export function fitToSchema(value: unknown, node: JsonObject): unknown {
  const branches: unknown[] = Array.isArray(node.anyOf) ? node.anyOf : [];
  const branch = branches.find((option) => isObject(option) && option.type !== "null");
  if (isObject(branch)) return fitToSchema(value, branch);
  if (typeof value === "string") return fitString(value, node.maxLength);
  if (Array.isArray(value)) return fitArray(value, node);
  if (isObject(value)) return fitObject(value, node);
  return value;
}

function fitString(value: string, max: unknown): string {
  return typeof max === "number" && value.length > max
    ? `${value.slice(0, max - 1).trimEnd()}…`
    : value;
}

function fitArray(value: unknown[], node: JsonObject): unknown[] {
  const kept = typeof node.maxItems === "number" ? value.slice(0, node.maxItems) : value;
  const { items } = node;
  return isObject(items) ? kept.map((item) => fitToSchema(item, items)) : kept;
}

function fitObject(value: JsonObject, node: JsonObject): JsonObject {
  const properties = isObject(node.properties) ? node.properties : {};
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      const sub = properties[key];
      return [key, isObject(sub) ? fitToSchema(child, sub) : child];
    }),
  );
}
