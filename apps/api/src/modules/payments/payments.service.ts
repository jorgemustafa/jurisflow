import { randomUUID } from "node:crypto";
import type {
  CancelPaymentInput,
  CreatePaymentInput,
  CreatePaymentScheduleInput,
  MarkPaymentPaidInput,
  PaymentListFilters,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  UpdatePaymentInput
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
  createdAt: Date;
  updatedAt: Date;
};

type ClientRef = { id: string };
type CaseRef = { id: string; clientId: string; totalFeeAmountCents: number | null };

export type CreatePaymentData = CreatePaymentInput & {
  source: PaymentSource;
  installmentNumber: number;
  installmentTotal: number;
  paymentScheduleId?: string;
};

type PaymentsRepository = {
  list(filters: PaymentListFilters): Promise<PaymentRecord[]>;
  findById(id: string): Promise<PaymentRecord | null>;
  findClientById(id: string): Promise<ClientRef | null>;
  findCaseById(id: string): Promise<CaseRef | null>;
  hasGeneratedSchedule(caseId: string): Promise<boolean>;
  create(data: CreatePaymentData): Promise<PaymentRecord>;
  createCaseSchedule(caseId: string, totalFeeAmountCents: number, payments: CreatePaymentData[]): Promise<PaymentRecord[]>;
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

export class PaymentScheduleError extends Error {
  constructor(message = "Payment schedule is invalid") {
    super(message);
  }
}

export class PaymentStatusError extends Error {
  constructor(message = "Payment status does not allow this operation") {
    super(message);
  }
}

function addMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
}

export function buildInstallments(caseId: string, clientId: string, input: CreatePaymentScheduleInput): CreatePaymentData[] {
  const baseAmount = Math.floor(input.totalFeeAmountCents / input.installmentCount);
  const remainder = input.totalFeeAmountCents - baseAmount * input.installmentCount;
  const scheduleId = randomUUID();
  const baseDescription = input.description ?? "Honorários";

  return Array.from({ length: input.installmentCount }, (_, index) => {
    const installmentNumber = index + 1;
    const isLast = installmentNumber === input.installmentCount;

    return {
      clientId,
      caseId,
      paymentScheduleId: scheduleId,
      source: "generated",
      description: `${baseDescription} - Parcela ${installmentNumber}/${input.installmentCount}`,
      amountCents: baseAmount + (isLast ? remainder : 0),
      dueDate: addMonths(input.firstDueDate, index),
      installmentNumber,
      installmentTotal: input.installmentCount
    };
  });
}

export function isOverdue(payment: Pick<PaymentRecord, "status" | "dueDate">, now = new Date()) {
  return payment.status === "pending" && payment.dueDate < now;
}

export function createPaymentsService(repository: PaymentsRepository) {
  async function ensureClient(clientId: string) {
    const client = await repository.findClientById(clientId);
    if (!client) throw new PaymentClientError("Client not found");
  }

  async function ensureCaseBelongsToClient(caseId: string | undefined, clientId: string) {
    if (!caseId) return null;
    const item = await repository.findCaseById(caseId);
    if (!item) throw new PaymentCaseError("Case not found");
    if (item.clientId !== clientId) throw new PaymentCaseError("Case must belong to the payment client");
    return item;
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
        installmentTotal: 1
      });
    },

    async createCaseSchedule(caseId: string, input: CreatePaymentScheduleInput) {
      const item = await repository.findCaseById(caseId);
      if (!item) throw new PaymentCaseError("Case not found");
      if (await repository.hasGeneratedSchedule(caseId)) throw new PaymentScheduleError("Case already has a generated payment schedule");

      const payments = buildInstallments(caseId, item.clientId, input);
      return repository.createCaseSchedule(caseId, input.totalFeeAmountCents, payments);
    },

    async update(id: string, input: UpdatePaymentInput) {
      const payment = await repository.findById(id);
      if (!payment) throw new PaymentNotFoundError();

      if (payment.status === "paid") throw new PaymentStatusError("Paid payments can only correct paidAt or be canceled");
      if (payment.status === "canceled") {
        const forbidden = input.amountCents !== undefined || input.dueDate !== undefined || input.description !== undefined;
        if (forbidden) throw new PaymentStatusError("Canceled payments can only edit cancel reason and notes");
        return repository.update(id, input as Partial<PaymentRecord>);
      }

      if (payment.source === "generated" && input.amountCents !== undefined) {
        throw new PaymentStatusError("Generated payment amount is locked");
      }

      return repository.update(id, input as Partial<PaymentRecord>);
    },

    async markPaid(id: string, input: MarkPaymentPaidInput) {
      const payment = await repository.findById(id);
      if (!payment) throw new PaymentNotFoundError();
      if (payment.status === "canceled") throw new PaymentStatusError("Canceled payment cannot be marked as paid");

      return repository.update(id, {
        status: "paid",
        paidAt: input.paidAt ?? new Date(),
        paymentMethod: input.paymentMethod
      });
    },

    async cancel(id: string, input: CancelPaymentInput) {
      const payment = await repository.findById(id);
      if (!payment) throw new PaymentNotFoundError();
      if (payment.status === "canceled") throw new PaymentStatusError("Payment is already canceled");

      return repository.update(id, {
        status: "canceled",
        canceledAt: new Date(),
        cancelReason: input.cancelReason,
        notes: input.notes === undefined ? payment.notes : input.notes
      });
    }
  };
}
