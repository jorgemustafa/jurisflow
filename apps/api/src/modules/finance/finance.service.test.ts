import { describe, expect, it } from "vitest";
import { createFinanceService, type FinanceDashboard } from "./finance.service.js";

function createRepository() {
  const calls: string[] = [];
  const repository = {
    calls,
    async dashboard(month: string): Promise<FinanceDashboard> {
      calls.push(month);
      return { month } as FinanceDashboard;
    }
  };
  return repository;
}

describe("finance service", () => {
  it("uses the month provided in the filters", async () => {
    const repository = createRepository();
    const service = createFinanceService(repository);

    const result = await service.dashboard({ month: "2026-03" });

    expect(repository.calls).toEqual(["2026-03"]);
    expect(result.month).toBe("2026-03");
  });

  it("defaults to the current UTC month when no month is provided", async () => {
    const repository = createRepository();
    const service = createFinanceService(repository);

    await service.dashboard({});

    const now = new Date();
    const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(repository.calls).toEqual([expected]);
    expect(repository.calls[0]).toMatch(/^\d{4}-\d{2}$/);
  });
});
