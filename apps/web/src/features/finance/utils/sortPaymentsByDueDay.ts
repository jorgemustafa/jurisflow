import type { Payment } from "src/services/finance.js";

export const sortPaymentsByDueDay = (payments: Payment[]) =>
  [...payments].sort(
    (left, right) =>
      left.dueDate.slice(8, 10).localeCompare(right.dueDate.slice(8, 10)) ||
      left.dueDate.localeCompare(right.dueDate),
  );
