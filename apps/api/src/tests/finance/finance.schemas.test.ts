import { describe, expect, it } from "vitest";
import { financeDashboardQuerySchema } from "../../modules/finance/finance.schemas.js";

describe("finance dashboard query schema", () => {
  it("accepts a valid YYYY-MM month", () => {
    const parsed = financeDashboardQuerySchema.parse({ month: "2026-06" });
    expect(parsed.month).toBe("2026-06");
  });

  it("treats month as optional", () => {
    const parsed = financeDashboardQuerySchema.parse({});
    expect(parsed.month).toBeUndefined();
  });

  it("rejects malformed month strings", () => {
    for (const month of ["2026-6", "2026/06", "26-06", "june", "202606", "2026-06-01"]) {
      expect(() => financeDashboardQuerySchema.parse({ month })).toThrow();
    }
  });
});
