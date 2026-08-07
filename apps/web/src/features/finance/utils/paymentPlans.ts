import type { Payment } from "src/services/finance.js";

export type PaymentPlanSummary = {
  id: string;
  caseId: string;
  clientName: string;
  caseTitle: string;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  installmentCount: number;
  paidInstallments: number;
  pendingInstallments: number;
  canceledInstallments: number;
  lastPaymentDueDate: string | null;
};

export const buildPaymentPlanSummaries = (
  payments: Payment[],
): PaymentPlanSummary[] => {
  const groups = new Map<string, Payment[]>();

  for (const payment of payments.filter(
    (item) =>
      item.source === "generated" && item.caseId && item.paymentScheduleId,
  )) {
    groups.set(payment.paymentScheduleId as string, [
      ...(groups.get(payment.paymentScheduleId as string) ?? []),
      payment,
    ]);
  }

  return Array.from(groups.entries())
    .map(([id, items]) => {
      const first = items[0]!;
      const paidPayments = items.filter((payment) => payment.status === "paid");
      const installments = items.filter(
        (payment) => payment.installmentNumber > 0,
      );
      const totalCents =
        first.caseTotalFeeAmountCents ??
        items.reduce((total, payment) => total + payment.amountCents, 0);
      const paidCents = paidPayments.reduce(
        (total, payment) => total + payment.amountCents,
        0,
      );

      return {
        id,
        caseId: first.caseId as string,
        clientName: first.clientName ?? first.clientId,
        caseTitle: first.caseTitle ?? "Sem processo vinculado",
        totalCents,
        paidCents,
        pendingCents: totalCents - paidCents,
        installmentCount: Math.max(
          ...items.map((payment) => payment.installmentTotal),
        ),
        paidInstallments: installments.filter(
          (payment) => payment.status === "paid",
        ).length,
        pendingInstallments: installments.filter(
          (payment) => payment.status === "pending",
        ).length,
        canceledInstallments: installments.filter(
          (payment) => payment.status === "canceled",
        ).length,
        lastPaymentDueDate: installments.reduce<string | null>(
          (lastDueDate, payment) =>
            !lastDueDate || payment.dueDate > lastDueDate
              ? payment.dueDate
              : lastDueDate,
          null,
        ),
      };
    })
    .sort((left, right) => right.pendingCents - left.pendingCents);
};
