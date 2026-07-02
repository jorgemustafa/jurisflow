import type { Prisma } from "@prisma/client";
import type { PaymentListFilters, PaymentStatus } from "./payments.schemas.js";

export type DbPaymentStatus = "PENDING" | "PAID" | "CANCELED";
export const toDbStatus = (value: PaymentStatus): DbPaymentStatus =>
  value.toUpperCase() as DbPaymentStatus;

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return null;
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export function listWhere(
  filters: PaymentListFilters,
): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};
  if (filters.status !== "all") where.status = toDbStatus(filters.status);
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.caseId) where.caseId = filters.caseId;

  if (filters.overdue) {
    where.status = "PENDING";
    where.dueDate = { lt: new Date() };
  }

  if (filters.month) {
    const range = monthRange(filters.month);
    if (range) {
      if (filters.status === "paid")
        where.paidAt = { gte: range.start, lt: range.end };
      else if (filters.status === "pending") where.dueDate = { lt: range.end };
      else if (filters.status === "canceled")
        where.dueDate = { gte: range.start, lt: range.end };
      else {
        where.OR = [
          { dueDate: { gte: range.start, lt: range.end } },
          { status: "PENDING", dueDate: { lt: range.start } },
          { paidAt: { gte: range.start, lt: range.end } },
        ];
      }
    }
  }

  if (filters.q) {
    const monthScope = where.OR;
    where.AND = [
      ...(monthScope ? [{ OR: monthScope }] : []),
      {
        OR: [
          { description: { contains: filters.q, mode: "insensitive" } },
          { client: { name: { contains: filters.q, mode: "insensitive" } } },
          { case: { title: { contains: filters.q, mode: "insensitive" } } },
        ],
      },
    ];
    if (monthScope) delete where.OR;
  }

  return where;
}
