import { isPaymentOverdue } from "src/features/finance/utils/isPaymentOverdue.js";
import type { Payment } from "src/services/finance.js";

const isInMonth = (value: string | null, month: string) =>
  value?.slice(0, 7) === month;

export const buildMonthSummary = (
  payments: Payment[],
  month: string,
  today = new Date().toISOString().slice(0, 10),
) => {
  const result = {
    received: 0,
    open: 0,
    overdue: 0,
    scheduled: 0,
    counts: { all: 0, pending: 0, paid: 0, canceled: 0 },
  };
  for (const payment of payments) {
    const overdue = isPaymentOverdue(payment, today);
    result.counts.all += 1;
    result.counts[payment.status] += 1;
    if (isInMonth(payment.paidAt, month))
      result.received += payment.amountCents;
    if (payment.status !== "canceled" && isInMonth(payment.dueDate, month))
      result.scheduled += payment.amountCents;
    if (
      payment.status === "pending" &&
      isInMonth(payment.dueDate, month) &&
      !overdue
    )
      result.open += payment.amountCents;
    if (overdue) result.overdue += payment.amountCents;
  }
  return result;
};
