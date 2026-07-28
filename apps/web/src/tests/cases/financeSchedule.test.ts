import { describe, expect, it } from "vitest";
import {
  calculateFinanceSchedule,
  dateWithDueDay,
  installmentAmountForCount,
} from "../../features/cases/utils/financeSchedule.js";

describe("case finance schedule calculator", () => {
  it("calculates remaining balance, installment count, due day, and final date", () => {
    const schedule = calculateFinanceSchedule(
      25_000_00,
      2_000_00,
      1_500_00,
      "2026-01-10",
    );

    expect(schedule).toEqual({
      balanceCents: 23_000_00,
      dueDay: 10,
      installmentCount: 16,
      lastDueDate: "2027-04-10",
    });
  });

  it("calculates installment value from desired count", () => {
    expect(installmentAmountForCount(23_000_00, 10)).toBe(2_300_00);
  });

  it("clamps due day to shorter months", () => {
    expect(dateWithDueDay("2026-02-10", 31)).toBe("2026-02-28");
  });
});
