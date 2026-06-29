import { describe, expect, it } from "vitest";
import { listWhere } from "../../modules/payments/payments.filters.js";

describe("monthly payment scope", () => {
  it("carries pending overdue payments into July and August without changing their due date", () => {
    const july = listWhere({ month: "2026-07", status: "all" });
    const august = listWhere({ month: "2026-08", status: "all" });

    expect(july.OR).toContainEqual({
      status: "PENDING",
      dueDate: { lt: new Date("2026-07-01T00:00:00.000Z") },
    });
    expect(august.OR).toContainEqual({
      status: "PENDING",
      dueDate: { lt: new Date("2026-08-01T00:00:00.000Z") },
    });
  });

  it("includes due payments and late receipts in one deduplicated OR query", () => {
    const where = listWhere({ month: "2026-08", status: "all" });
    expect(where.OR).toEqual([
      {
        dueDate: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lt: new Date("2026-09-01T00:00:00.000Z"),
        },
      },
      {
        status: "PENDING",
        dueDate: { lt: new Date("2026-08-01T00:00:00.000Z") },
      },
      {
        paidAt: {
          gte: new Date("2026-08-01T00:00:00.000Z"),
          lt: new Date("2026-09-01T00:00:00.000Z"),
        },
      },
    ]);
  });

  it("scopes an explicit paid filter by receipt month", () => {
    expect(listWhere({ month: "2026-09", status: "paid" })).toMatchObject({
      status: "PAID",
      paidAt: {
        gte: new Date("2026-09-01T00:00:00.000Z"),
        lt: new Date("2026-10-01T00:00:00.000Z"),
      },
    });
  });
});
