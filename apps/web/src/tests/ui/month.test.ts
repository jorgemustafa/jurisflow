import { describe, expect, it } from "vitest";
import { monthLabel, moveMonth } from "src/utils/month.js";

describe("seletor de competência", () => {
  it("exibe o mês em português", () => {
    expect(monthLabel("2026-03")).toBe("Março de 2026");
  });

  it("navega entre anos preservando a competência", () => {
    expect(moveMonth("2026-01", -1)).toBe("2025-12");
    expect(moveMonth("2026-12", 1)).toBe("2027-01");
  });
});
