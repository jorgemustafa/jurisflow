import type { Payment } from "src/services/finance.js";

export type PaymentPlanSummary = {
  id: string;
  clientName: string;
  caseTitle: string;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  installmentCount: number;
  paidInstallments: number;
  pendingInstallments: number;
  canceledInstallments: number;
};

export const buildPaymentPlanSummaries = (payments: Payment[]): PaymentPlanSummary[] => {
  const groups = new Map<string, Payment[]>();

  for (const payment of payments) {
    const key = payment.caseId ?? `client-${payment.clientId}`;
    groups.set(key, [...(groups.get(key) ?? []), payment]);
  }

  return Array.from(groups.entries())
    .map(([id, items]) => {
      const first = items[0]!;
      const activePayments = items.filter((payment) => payment.status !== "canceled");
      const paidPayments = items.filter((payment) => payment.status === "paid");
      const pendingPayments = items.filter((payment) => payment.status === "pending");
      const totalFromCase = first.caseTotalFeeAmountCents;

      return {
        id,
        clientName: first.clientName ?? first.clientId,
        caseTitle: first.caseTitle ?? "Sem processo vinculado",
        totalCents: totalFromCase ?? activePayments.reduce((total, payment) => total + payment.amountCents, 0),
        paidCents: paidPayments.reduce((total, payment) => total + payment.amountCents, 0),
        pendingCents: pendingPayments.reduce((total, payment) => total + payment.amountCents, 0),
        installmentCount: Math.max(...items.map((payment) => payment.installmentTotal)),
        paidInstallments: paidPayments.length,
        pendingInstallments: pendingPayments.length,
        canceledInstallments: items.length - activePayments.length
      };
    })
    .sort((left, right) => right.pendingCents - left.pendingCents);
};
