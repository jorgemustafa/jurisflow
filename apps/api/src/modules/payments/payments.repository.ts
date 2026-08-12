import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import {
  listWhere,
  toDbStatus,
  type DbPaymentStatus,
} from "./payments.filters.js";
import type {
  PaymentListFilters,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
} from "./payments.schemas.js";
import type { CreatePaymentData, PaymentRecord } from "./payments.service.js";

type DbPaymentSource = "GENERATED" | "MANUAL";
type DbPaymentMethod =
  | "PIX"
  | "CASH"
  | "BANK_TRANSFER"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BOLETO"
  | "OTHER";

const toApiStatus = (value: DbPaymentStatus): PaymentStatus =>
  value.toLowerCase() as PaymentStatus;
const toDbSource = (value: PaymentSource): DbPaymentSource =>
  value.toUpperCase() as DbPaymentSource;
const toApiSource = (value: DbPaymentSource): PaymentSource =>
  value.toLowerCase() as PaymentSource;
const toDbMethod = (value: PaymentMethod): DbPaymentMethod =>
  value.toUpperCase() as DbPaymentMethod;
const toApiMethod = (value: DbPaymentMethod): PaymentMethod =>
  value.toLowerCase() as PaymentMethod;

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
  client?: { name: string };
  case?: {
    title: string;
    cnjNumber: string | null;
    totalFeeAmountCents: number | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPaymentRecord(payment: DbPayment): PaymentRecord {
  const { client, case: linkedCase, ...data } = payment;

  return {
    ...data,
    source: toApiSource(payment.source),
    status: toApiStatus(payment.status),
    paymentMethod: payment.paymentMethod
      ? toApiMethod(payment.paymentMethod)
      : null,
    clientName: client?.name,
    caseTitle: linkedCase?.title ?? null,
    caseCnjNumber: linkedCase?.cnjNumber ?? null,
    caseTotalFeeAmountCents: linkedCase?.totalFeeAmountCents ?? null,
  };
}

export function writePayment(
  data: CreatePaymentData,
): Prisma.PaymentUncheckedCreateInput {
  return {
    ...data,
    source: toDbSource(data.source),
    status: data.status ? toDbStatus(data.status) : undefined,
    paymentMethod: data.paymentMethod
      ? toDbMethod(data.paymentMethod)
      : undefined,
  };
}

function writeUpdate(
  data: Partial<PaymentRecord>,
): Prisma.PaymentUncheckedUpdateInput {
  return {
    ...data,
    status: data.status ? toDbStatus(data.status) : undefined,
    source: data.source ? toDbSource(data.source) : undefined,
    paymentMethod: data.paymentMethod
      ? toDbMethod(data.paymentMethod)
      : data.paymentMethod,
  };
}

export const paymentsRepository = {
  async list(filters: PaymentListFilters) {
    const payments = await prisma.payment.findMany({
      where: listWhere(filters),
      include: {
        client: { select: { name: true } },
        case: {
          select: { title: true, cnjNumber: true, totalFeeAmountCents: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });
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
    return prisma.case.findUnique({
      where: { id },
      select: { id: true, clientId: true, totalFeeAmountCents: true },
    });
  },

  async create(data: CreatePaymentData) {
    const payment = await prisma.payment.create({ data: writePayment(data) });
    return toPaymentRecord(payment as DbPayment);
  },

  async update(id: string, data: Partial<PaymentRecord>) {
    const payment = await prisma.payment.update({
      where: { id },
      data: writeUpdate(data),
    });
    return toPaymentRecord(payment as DbPayment);
  },
};
