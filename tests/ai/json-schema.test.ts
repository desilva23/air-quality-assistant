import { describe, expect, it } from "vitest";
import { fitToSchema, isObject, responseSchemas } from "@/lib/ai/json-schema";
import { z } from "@/lib/zod";

const schema = z.object({
  title: z.string().max(10).describe("Short title"),
  format: z.string(),
  note: z.string().max(5).nullable(),
  tags: z.array(z.string().max(3)).min(1).max(2),
  empty: z.array(z.string()).max(1),
});

describe("responseSchemas", () => {
  const { portable, full } = responseSchemas(schema);

  it("sends limits as hints the provider accepts, keeping fields named like keywords", () => {
    const properties = portable.properties;
    expect(isObject(properties)).toBe(true);
    expect(JSON.stringify(portable)).not.toMatch(/"maxLength"|"minItems"|"\$schema"/);
    expect(JSON.stringify(portable)).toContain(
      '"description":"Short title; at most 10 characters"',
    );
    expect(JSON.stringify(portable)).toContain('"description":"at least 1 items; at most 2 items"');
    expect(Object.keys(isObject(properties) ? properties : {})).toContain("format");
  });

  it("keeps the full schema for trimming", () => {
    expect(JSON.stringify(full)).toContain('"maxLength":10');
  });
});

describe("fitToSchema", () => {
  const { full } = responseSchemas(schema);

  it("trims long text and extra items, and leaves nulls and other values alone", () => {
    const reply = {
      title: "A very long title indeed",
      format: "x",
      note: null,
      tags: ["abcd", "ef", "gh"],
      empty: [],
      extra: 1,
    };
    expect(fitToSchema(reply, full)).toEqual({
      title: "A very lo…",
      format: "x",
      note: null,
      tags: ["ab…", "ef"],
      empty: [],
      extra: 1,
    });
  });

  it("trims inside a nullable field and passes non-objects through", () => {
    expect(fitToSchema({ note: "too long" }, full)).toEqual({ note: "too…" });
    expect(fitToSchema(42, full)).toBe(42);
    expect(fitToSchema(["a"], { type: "array" })).toEqual(["a"]);
    expect(fitToSchema({ a: 1 }, { type: "object" })).toEqual({ a: 1 });
    expect(fitToSchema("x", { anyOf: [{ type: "null" }] })).toBe("x");
  });
});
