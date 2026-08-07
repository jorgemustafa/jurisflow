import { randomUUID } from "node:crypto";
import type { CaseFinanceInput } from "@magistrum/shared";
import type {
  CancelPaymentInput,
  CreatePaymentInput,
  MarkPaymentPaidInput,
  PaymentListFilters,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  UpdatePaymentInput,
} from "./payments.schemas.js";

export type PaymentRecord = {
  id: string;
  clientId: string;
  caseId: string | null;
  paymentScheduleId: string | null;
  source: PaymentSource;
  description: string;
  amountCents: number;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: PaymentMethod | null;
  status: PaymentStatus;
  installmentNumber: number;
  installmentTotal: number;
  notes: string | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  clientName?: string;
  caseTitle?: string | null;
  caseTotalFeeAmountCents?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClientRef = { id: string };
type CaseRef = {
  id: string;
  clientId: string;
  totalFeeAmountCents: number;
};

export type CreatePaymentData = CreatePaymentInput & {
  source: PaymentSource;
  installmentNumber: number;
  installmentTotal: number;
  paymentScheduleId?: string;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
};

type PaymentsRepository = {
  list(filters: PaymentListFilters): Promise<PaymentRecord[]>;
  findById(id: string): Promise<PaymentRecord | null>;
  findClientById(id: string): Promise<ClientRef | null>;
  findCaseById(id: string): Promise<CaseRef | null>;
  create(data: CreatePaymentData): Promise<PaymentRecord>;
  update(id: string, data: Partial<PaymentRecord>): Promise<PaymentRecord>;
};

export class PaymentNotFoundError extends Error {
  constructor() {
    super("Payment not found");
  }
}

export class PaymentClientError extends Error {
  constructor(message = "Client is invalid for this payment") {
    super(message);
  }
}

export class PaymentCaseError extends Error {
  constructor(message = "Case is invalid for this payment") {
    super(message);
  }
}

export class PaymentStatusError extends Error {
  constructor(message = "Payment status does not allow this operation") {
    super(message);
  }
}

export function addMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      month,
      Math.min(day, lastDay),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    ),
  );
}

export function buildCasePayments(
  caseId: string,
  clientId: string,
  finance: CaseFinanceInput,
  createdAt: Date,
  scheduleId: string = randomUUID(),
): CreatePaymentData[] {
  const firstDueDate = new Date(`${finance.firstDueDate}T12:00:00.000Z`);
  const entryReceivedAt = new Date(
    `${finance.entryReceivedAt ?? createdAt.toISOString().slice(0, 10)}T12:00:00.000Z`,
  );
  const today = new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate()));

  const balance = finance.totalFeeAmountCents - finance.entryAmountCents;
  const installmentTotal = Math.ceil(balance / finance.installmentAmountCents);
  const entry: CreatePaymentData = {
    clientId,
    caseId,
    paymentScheduleId: scheduleId,
    source: "generated",
    description: "Honorários - Entrada",
    amountCents: finance.entryAmountCents,
    dueDate: entryReceivedAt,
    paidAt: entryReceivedAt,
    paymentMethod: finance.entryPaymentMethod,
    status: "paid",
    installmentNumber: 0,
    installmentTotal,
  };

  const installments = Array.from({ length: installmentTotal }, (_, index) => {
    const installmentNumber = index + 1;
    const amountCents = Math.min(
      finance.installmentAmountCents,
      balance - index * finance.installmentAmountCents,
    );
    const dueDate = addMonths(firstDueDate, index);
    const paid = finance.pastInstallmentsPaid !== false && dueDate < today;
    return {
      clientId,
      caseId,
      paymentScheduleId: scheduleId,
      source: "generated",
      description: `Honorários - Parcela ${installmentNumber}/${installmentTotal}`,
      amountCents,
      dueDate,
      installmentNumber,
      installmentTotal,
      ...(paid
        ? {
            status: "paid" as const,
            paidAt: dueDate,
            paymentMethod: finance.entryPaymentMethod,
          }
        : {}),
    } satisfies CreatePaymentData;
  });

  return [entry, ...installments];
}

export function isOverdue(
  payment: Pick<PaymentRecord, "status" | "dueDate">,
  now = new Date(),
) {
  return payment.status === "pending" && payment.dueDate < now;
}

export function createPaymentsService(repository: PaymentsRepository) {
  async function ensureClient(clientId: string) {
    const client = await repository.findClientById(clientId);
    if (!client) throw new PaymentClientError("Client not found");
  }

  async function ensureCaseBelongsToClient(
    caseId: string | undefined,
    clientId: string,
  ) {
    if (!caseId) return;
    const item = await repository.findCaseById(caseId);
    if (!item) throw new PaymentCaseError("Case not found");
    if (item.clientId !== clientId)
      throw new PaymentCaseError("Case must belong to the payment client");
  }

  return {
    list(filters: PaymentListFilters) {
      return repository.list(filters);
    },

    async create(input: CreatePaymentInput) {
      await ensureClient(input.clientId);
      await ensureCaseBelongsToClient(input.caseId, input.clientId);
      return repository.create({
        ...input,
        source: "manual",
        installmentNumber: 1,
        installmentTotal: 1,
      });
    },

    async update(id: string, input: UpdatePaymentInput) {
      const payment = await repository.findById(id);
      if (!payment) throw new PaymentNotFoundError();

      if (payment.source === "generated") {
        if (Object.keys(input).some((key) => key !== "notes"))
          throw new PaymentStatusError(
            "Generated payments only allow notes to be updated",
          );
        return repository.update(id, input as Partial<PaymentRecord>);
      }

      if (payment.status === "paid") {
        const forbidden =
          input.amountCents !== undefined ||
          input.dueDate !== undefined ||
          input.description !== undefined ||
          input.cancelReason !== undefined;
        if (forbidden)
          throw new PaymentStatusError(
            "Paid payments can only correct paidAt or be canceled",
          );
        return repository.update(id, input as Partial<PaymentRecord>);
      }
      if (payment.status === "canceled") {
        const forbidden =
          input.amountCents !== undefined ||
          input.dueDate !== undefined ||
          input.description !== undefined ||
          input.paidAt !== undefined;
        if (forbidden)
          throw new PaymentStatusError(
            "Canceled payments can only edit cancel reason and notes",
          );
        return repository.update(id, input as Partial<PaymentRecord>);
      }
      if (input.paidAt !== undefined)
        throw new PaymentStatusError(
          "Use the paid action to register a payment receipt",
        );
      return repository.update(id, input as Partial<PaymentRecord>);
    },

    async markPaid(id: string, input: MarkPaymentPaidInput) {
      const payment = await repository.findById(id);
      if (!payment) throw new PaymentNotFoundError();
      if (payment.status === "canceled")
        throw new PaymentStatusError(
          "Canceled payment cannot be marked as paid",
        );
      return repository.update(id, {
        status: "paid",
        paidAt: input.paidAt ?? new Date(),
        paymentMethod: input.paymentMethod,
      });
    },

    async cancel(id: string, input: CancelPaymentInput) {
      const payment = await repository.findById(id);
      if (!payment) throw new PaymentNotFoundError();
      if (payment.source === "generated")
        throw new PaymentStatusError("Generated payments cannot be canceled");
      if (payment.status === "canceled")
        throw new PaymentStatusError("Payment is already canceled");
      return repository.update(id, {
        status: "canceled",
        canceledAt: new Date(),
        cancelReason: input.cancelReason,
        notes: input.notes ?? payment.notes,
      });
    },
  };
}
