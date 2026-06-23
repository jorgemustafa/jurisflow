import { describe, expect, it } from "vitest";
import { buildPaymentPlanSummaries } from "../../features/finance/utils/paymentPlans.js";
import type { Payment } from "../../services/finance.js";

const payment = (overrides: Partial<Payment>): Payment => ({
  id: "payment-1",
  clientId: "client-1",
  caseId: "case-1",
  source: "generated",
  description: "Honorarios",
  amountCents: 10000,
  dueDate: "2026-05-10T00:00:00.000Z",
  paidAt: null,
  paymentMethod: null,
  status: "pending",
  installmentNumber: 1,
  installmentTotal: 3,
  notes: null,
  clientName: "Cliente Demo",
  caseTitle: "Processo Demo",
  caseTotalFeeAmountCents: 30000,
  ...overrides
});

describe("payment plan summaries", () => {
  it("uses case total and counts installments by status", () => {
    const summaries = buildPaymentPlanSummaries([
      payment({ id: "payment-1", status: "paid", paidAt: "2026-05-10T00:00:00.000Z" }),
      payment({ id: "payment-2", installmentNumber: 2, status: "pending" }),
      payment({ id: "payment-3", installmentNumber: 3, status: "canceled" })
    ]);

    expect(summaries).toEqual([
      expect.objectContaining({
        totalCents: 30000,
        paidCents: 10000,
        pendingCents: 10000,
        installmentCount: 3,
        paidInstallments: 1,
        pendingInstallments: 1,
        canceledInstallments: 1
      })
    ]);
  });

  it("sums active payments when no case total exists", () => {
    const summaries = buildPaymentPlanSummaries([
      payment({ id: "payment-1", caseTotalFeeAmountCents: null, amountCents: 15000 }),
      payment({ id: "payment-2", caseTotalFeeAmountCents: null, amountCents: 15000, installmentNumber: 2, status: "paid" }),
      payment({ id: "payment-3", caseTotalFeeAmountCents: null, amountCents: 15000, installmentNumber: 3, status: "canceled" })
    ]);

    expect(summaries[0]?.totalCents).toBe(30000);
  });
});
