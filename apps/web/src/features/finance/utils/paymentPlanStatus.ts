import { isPaymentOverdue } from "src/features/finance/utils/isPaymentOverdue.js";
import type { Payment } from "src/services/finance.js";

export type PaymentPlanTab = "pending" | "paid" | "overdue";

export const filterPaymentPlanByStatus = (
  payments: Payment[],
  tab: PaymentPlanTab,
) =>
  payments.filter((payment) => {
    if (tab === "paid") return payment.status === "paid";
    if (tab === "overdue") return isPaymentOverdue(payment);
    return payment.status === "pending" && !isPaymentOverdue(payment);
  });
