import { describe, it, expect } from "vitest";
import { paginationQuerySchema } from "./common";

describe("paginationQuerySchema", () => {
  it("applies defaults", () => {
    const r = paginationQuerySchema.parse({});
    expect(r).toEqual({ page: 1, limit: 20, sort: undefined });
  });
  it("coerces and clamps limit", () => {
    const r = paginationQuerySchema.parse({ page: "2", limit: "500" });
    expect(r.page).toBe(2);
    expect(r.limit).toBe(100);
  });
});
