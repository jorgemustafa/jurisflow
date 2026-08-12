import { describe, expect, it } from "vitest";
import { filterPaymentPlanByStatus } from "../../features/finance/utils/paymentPlanStatus.js";
import type { Payment } from "../../services/finance.js";

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "payment-1",
  clientId: "client-1",
  caseId: "case-1",
  paymentScheduleId: "schedule-1",
  source: "generated",
  description: "Honorários",
  amountCents: 10000,
  dueDate: "2099-01-10T00:00:00.000Z",
  paidAt: null,
  paymentMethod: null,
  status: "pending",
  installmentNumber: 1,
  installmentTotal: 3,
  notes: null,
  clientName: "Cliente",
  caseTitle: "Processo",
  caseTotalFeeAmountCents: 30000,
  ...overrides,
});

describe("payment plan status tabs", () => {
  it("keeps paid, pending and overdue installments separate", () => {
    const items = [
      payment({
        id: "paid",
        status: "paid",
        paidAt: "2026-08-01T00:00:00.000Z",
      }),
      payment({ id: "pending" }),
      payment({ id: "overdue", dueDate: "2020-01-10T00:00:00.000Z" }),
    ];

    expect(
      filterPaymentPlanByStatus(items, "paid").map((item) => item.id),
    ).toEqual(["paid"]);
    expect(
      filterPaymentPlanByStatus(items, "pending").map((item) => item.id),
    ).toEqual(["pending"]);
    expect(
      filterPaymentPlanByStatus(items, "overdue").map((item) => item.id),
    ).toEqual(["overdue"]);
  });
});
