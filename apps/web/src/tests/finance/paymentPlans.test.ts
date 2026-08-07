import { describe, expect, it } from "vitest";
import { buildPaymentPlanSummaries } from "../../features/finance/utils/paymentPlans.js";
import type { Payment } from "../../services/finance.js";

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "payment-1",
  clientId: "client-1",
  caseId: "case-1",
  paymentScheduleId: "schedule-1",
  source: "generated",
  description: "Honorários",
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
  caseTotalFeeAmountCents: 40000,
  ...overrides,
});

describe("payment plan summaries", () => {
  it("counts the entry as received value but excludes it from installment progress", () => {
    const summaries = buildPaymentPlanSummaries([
      payment({
        id: "entry",
        installmentNumber: 0,
        amountCents: 10000,
        status: "paid",
        paidAt: "2026-05-01T00:00:00.000Z",
      }),
      payment({
        id: "payment-1",
        installmentNumber: 1,
        status: "paid",
        paidAt: "2026-06-10T00:00:00.000Z",
      }),
      payment({
        id: "payment-2",
        installmentNumber: 2,
        dueDate: "2026-06-10T00:00:00.000Z",
      }),
      payment({
        id: "payment-3",
        installmentNumber: 3,
        dueDate: "2026-07-10T00:00:00.000Z",
      }),
    ]);

    expect(summaries[0]).toMatchObject({
      caseId: "case-1",
      totalCents: 40000,
      paidCents: 20000,
      pendingCents: 20000,
      installmentCount: 3,
      paidInstallments: 1,
      pendingInstallments: 2,
      lastPaymentDueDate: "2026-07-10T00:00:00.000Z",
    });
  });

  it("ignores manual payments linked to the same case", () => {
    const summaries = buildPaymentPlanSummaries([
      payment({ id: "entry", installmentNumber: 0, status: "paid" }),
      payment({
        id: "manual",
        source: "manual",
        paymentScheduleId: null,
        amountCents: 50000,
        status: "paid",
      }),
    ]);
    expect(summaries[0]?.paidCents).toBe(10000);
  });

  it("does not create plans for client-only or manual payments", () => {
    expect(
      buildPaymentPlanSummaries([
        payment({ source: "manual", paymentScheduleId: null }),
      ]),
    ).toEqual([]);
  });
});
