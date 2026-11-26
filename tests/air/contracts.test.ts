import { describe, expect, it } from "vitest";
import { AirQuerySchema, PlacesQuerySchema } from "@/lib/air/contracts";

describe("air data queries", () => {
  it("reads coordinates from the query string and rounds them", () => {
    expect(AirQuerySchema.parse({ lat: "28.61394", lon: "77.2090" })).toEqual({
      lat: 28.61,
      lon: 77.21,
    });
  });

  it("refuses points outside India and missing values", () => {
    expect(AirQuerySchema.safeParse({ lat: "51.5", lon: "-0.12" }).success).toBe(false);
    expect(AirQuerySchema.safeParse({ lat: "28.6" }).success).toBe(false);
  });

  it("needs at least two letters to search", () => {
    expect(PlacesQuerySchema.safeParse({ q: " N " }).success).toBe(false);
    expect(PlacesQuerySchema.parse({ q: " Noida " })).toEqual({ q: "Noida" });
  });
});
