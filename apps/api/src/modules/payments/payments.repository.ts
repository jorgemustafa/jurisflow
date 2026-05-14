import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { PaymentListFilters, PaymentMethod, PaymentSource, PaymentStatus } from "./payments.schemas.js";
import type { CreatePaymentData, PaymentRecord } from "./payments.service.js";

type DbPaymentStatus = "PENDING" | "PAID" | "CANCELED";
type DbPaymentSource = "GENERATED" | "MANUAL";
type DbPaymentMethod = "PIX" | "CASH" | "BANK_TRANSFER" | "CREDIT_CARD" | "DEBIT_CARD" | "BOLETO" | "OTHER";

const toDbStatus = (value: PaymentStatus): DbPaymentStatus => value.toUpperCase() as DbPaymentStatus;
const toApiStatus = (value: DbPaymentStatus): PaymentStatus => value.toLowerCase() as PaymentStatus;
const toDbSource = (value: PaymentSource): DbPaymentSource => value.toUpperCase() as DbPaymentSource;
const toApiSource = (value: DbPaymentSource): PaymentSource => value.toLowerCase() as PaymentSource;
const toDbMethod = (value: PaymentMethod): DbPaymentMethod => value.toUpperCase() as DbPaymentMethod;
const toApiMethod = (value: DbPaymentMethod): PaymentMethod => value.toLowerCase() as PaymentMethod;

type DbPayment = {
  id: string;
  clientId: string;
  caseId: string | null;
  paymentScheduleId: string | null;
  source: DbPaymentSource;
  description: string;
  amountCents: number;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: DbPaymentMethod | null;
  status: DbPaymentStatus;
  installmentNumber: number;
  installmentTotal: number;
  notes: string | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPaymentRecord(payment: DbPayment): PaymentRecord {
  return {
    ...payment,
    source: toApiSource(payment.source),
    status: toApiStatus(payment.status),
    paymentMethod: payment.paymentMethod ? toApiMethod(payment.paymentMethod) : null
  };
}

function writePayment(data: CreatePaymentData): Prisma.PaymentUncheckedCreateInput {
  return {
    ...data,
    source: toDbSource(data.source)
  };
}

function writeUpdate(data: Partial<PaymentRecord>): Prisma.PaymentUncheckedUpdateInput {
  return {
    ...data,
    status: data.status ? toDbStatus(data.status) : undefined,
    source: data.source ? toDbSource(data.source) : undefined,
    paymentMethod: data.paymentMethod ? toDbMethod(data.paymentMethod) : data.paymentMethod
  };
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return null;
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

function listWhere(filters: PaymentListFilters): Prisma.PaymentWhereInput {
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
      if (filters.status === "paid") where.paidAt = { gte: range.start, lt: range.end };
      else where.dueDate = { gte: range.start, lt: range.end };
    }
  }

  if (filters.q) {
    where.OR = [
      { description: { contains: filters.q, mode: "insensitive" } },
      { client: { name: { contains: filters.q, mode: "insensitive" } } },
      { case: { title: { contains: filters.q, mode: "insensitive" } } }
    ];
  }

  return where;
}

export const paymentsRepository = {
  async list(filters: PaymentListFilters) {
    const payments = await prisma.payment.findMany({ where: listWhere(filters), orderBy: { dueDate: "asc" } });
    return payments.map((payment) => toPaymentRecord(payment as DbPayment));
  },

  async findById(id: string) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    return payment ? toPaymentRecord(payment as DbPayment) : null;
  },

  async findClientById(id: string) {
    return prisma.client.findUnique({ where: { id }, select: { id: true } });
  },

  async findCaseById(id: string) {
    return prisma.case.findUnique({ where: { id }, select: { id: true, clientId: true, totalFeeAmountCents: true } });
  },

  async hasGeneratedSchedule(caseId: string) {
    const count = await prisma.payment.count({ where: { caseId, source: "GENERATED" } });
    return count > 0;
  },

  async create(data: CreatePaymentData) {
    const payment = await prisma.payment.create({ data: writePayment(data) });
    return toPaymentRecord(payment as DbPayment);
  },

  async createCaseSchedule(caseId: string, totalFeeAmountCents: number, payments: CreatePaymentData[]) {
    return prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: { totalFeeAmountCents } });

      const created: PaymentRecord[] = [];
      for (const payment of payments) {
        const item = await tx.payment.create({ data: writePayment(payment) });
        created.push(toPaymentRecord(item as DbPayment));
      }
      return created;
    });
  },

  async update(id: string, data: Partial<PaymentRecord>) {
    const payment = await prisma.payment.update({ where: { id }, data: writeUpdate(data) });
    return toPaymentRecord(payment as DbPayment);
  }
};
