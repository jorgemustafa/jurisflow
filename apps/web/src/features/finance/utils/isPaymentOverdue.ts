import type { Payment } from "src/services/finance.js";

export const isPaymentOverdue = (
  payment: Payment,
  today = new Date().toISOString().slice(0, 10),
) => payment.status === "pending" && payment.dueDate.slice(0, 10) < today;
