import { describe, expect, it } from "vitest";
import { buildMonthSummary } from "../../features/finance/utils/monthSummary.js";
import type { Payment } from "../../services/finance.js";

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "payment-1",
  clientId: "client-1",
  caseId: "case-1",
  paymentScheduleId: "schedule-1",
  source: "generated",
  description: "Parcela",
  amountCents: 50000,
  dueDate: "2026-08-10T12:00:00.000Z",
  paidAt: null,
  paymentMethod: null,
  status: "pending",
  installmentNumber: 1,
  installmentTotal: 3,
  notes: null,
  ...overrides,
});

describe("finance month summary", () => {
  it("separates selected-month schedule, carried overdue, and late receipts", () => {
    const summary = buildMonthSummary(
      [
        payment(),
        payment({ id: "overdue", dueDate: "2026-06-10T12:00:00.000Z" }),
        payment({
          id: "late-paid",
          dueDate: "2026-06-10T12:00:00.000Z",
          paidAt: "2026-08-15T12:00:00.000Z",
          status: "paid",
        }),
      ],
      "2026-08",
      "2026-08-01",
    );

    expect(summary).toMatchObject({
      received: 50000,
      open: 50000,
      overdue: 50000,
      scheduled: 50000,
    });
  });

  it("excludes canceled payments from the expected total", () => {
    const summary = buildMonthSummary(
      [payment({ status: "canceled" })],
      "2026-08",
      "2026-08-01",
    );
    expect(summary.scheduled).toBe(0);
  });

  it("does not mark a future payment overdue when viewing a later month", () => {
    const summary = buildMonthSummary(
      [payment({ dueDate: "2026-07-10T12:00:00.000Z" })],
      "2026-08",
      "2026-06-29",
    );
    expect(summary.overdue).toBe(0);
  });
});
