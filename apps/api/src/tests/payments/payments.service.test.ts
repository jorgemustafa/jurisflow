import { describe, expect, it } from "vitest";
import type { CreatePaymentData, PaymentRecord } from "../../modules/payments/payments.service.js";
import {
  PaymentCaseError,
  PaymentScheduleError,
  PaymentStatusError,
  buildInstallments,
  createPaymentsService,
  isOverdue
} from "../../modules/payments/payments.service.js";
import type { PaymentListFilters } from "../../modules/payments/payments.schemas.js";

const now = new Date("2026-05-14T12:00:00.000Z");

function payment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "payment-1",
    clientId: "client-1",
    caseId: "case-1",
    paymentScheduleId: null,
    source: "manual",
    description: "Honorários",
    amountCents: 100000,
    dueDate: new Date("2026-06-10T12:00:00.000Z"),
    paidAt: null,
    paymentMethod: null,
    status: "pending",
    installmentNumber: 1,
    installmentTotal: 1,
    notes: null,
    canceledAt: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository(options: { existingSchedule?: boolean; caseClientId?: string } = {}) {
  const payments: PaymentRecord[] = [];

  return {
    payments,
    async list(_filters: PaymentListFilters) {
      return payments;
    },
    async findById(id: string) {
      return payments.find((item) => item.id === id) ?? null;
    },
    async findClientById(id: string) {
      return id === "client-1" ? { id } : null;
    },
    async findCaseById(id: string) {
      return id === "case-1" ? { id, clientId: options.caseClientId ?? "client-1", totalFeeAmountCents: null } : null;
    },
    async hasGeneratedSchedule(_caseId: string) {
      return options.existingSchedule ?? false;
    },
    async create(data: CreatePaymentData) {
      const item = payment({
        id: `payment-${payments.length + 1}`,
        ...data,
        caseId: data.caseId ?? null,
        paymentScheduleId: data.paymentScheduleId ?? null,
        paidAt: null,
        paymentMethod: null,
        status: "pending",
        notes: data.notes ?? null
      });
      payments.push(item);
      return item;
    },
    async createCaseSchedule(_caseId: string, _totalFeeAmountCents: number, data: CreatePaymentData[]) {
      for (const item of data) {
        payments.push(
          payment({
            id: `payment-${payments.length + 1}`,
            ...item,
            caseId: item.caseId ?? null,
            paymentScheduleId: item.paymentScheduleId ?? null,
            status: "pending"
          })
        );
      }
      return payments;
    },
    async update(id: string, data: Partial<PaymentRecord>) {
      const item = payments.find((current) => current.id === id);
      if (!item) throw new Error("test setup error");
      Object.assign(item, data, { updatedAt: now });
      return item;
    },
    seed(item: PaymentRecord) {
      payments.push(item);
    }
  };
}

describe("payments service", () => {
  it("creates a manual client-only payment", async () => {
    const repository = createRepository();
    const service = createPaymentsService(repository);

    const created = await service.create({
      clientId: "client-1",
      description: "Consulta",
      amountCents: 50000,
      dueDate: new Date("2026-06-10T12:00:00.000Z")
    });

    expect(created).toMatchObject({
      clientId: "client-1",
      caseId: null,
      source: "manual",
      installmentNumber: 1,
      installmentTotal: 1
    });
  });

  it("rejects case-linked payments when the case belongs to another client", async () => {
    const service = createPaymentsService(createRepository({ caseClientId: "client-2" }));

    await expect(
      service.create({
        clientId: "client-1",
        caseId: "case-1",
        description: "Honorários",
        amountCents: 100000,
        dueDate: new Date("2026-06-10T12:00:00.000Z")
      })
    ).rejects.toBeInstanceOf(PaymentCaseError);
  });

  it("generates monthly installments and puts rounding remainder in the last one", () => {
    const installments = buildInstallments("case-1", "client-1", {
      totalFeeAmountCents: 10000,
      installmentCount: 3,
      firstDueDate: new Date("2026-01-31T12:00:00.000Z")
    });

    expect(installments.map((item) => item.amountCents)).toEqual([3333, 3333, 3334]);
    expect(installments.map((item) => item.dueDate.toISOString().slice(0, 10))).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(new Set(installments.map((item) => item.paymentScheduleId)).size).toBe(1);
  });

  it("prevents more than one generated schedule per case", async () => {
    const service = createPaymentsService(createRepository({ existingSchedule: true }));

    await expect(
      service.createCaseSchedule("case-1", {
        totalFeeAmountCents: 100000,
        installmentCount: 1,
        firstDueDate: new Date("2026-06-10T12:00:00.000Z")
      })
    ).rejects.toBeInstanceOf(PaymentScheduleError);
  });

  it("computes overdue from pending status and due date", () => {
    expect(isOverdue(payment({ dueDate: new Date("2026-05-13T12:00:00.000Z") }), now)).toBe(true);
    expect(isOverdue(payment({ status: "paid", dueDate: new Date("2026-05-13T12:00:00.000Z") }), now)).toBe(false);
  });

  it("locks generated payment amounts", async () => {
    const repository = createRepository();
    repository.seed(payment({ source: "generated" }));
    const service = createPaymentsService(repository);

    await expect(service.update("payment-1", { amountCents: 200000 })).rejects.toBeInstanceOf(PaymentStatusError);
  });

  it("marks a payment as paid with paidAt and payment method", async () => {
    const repository = createRepository();
    repository.seed(payment());
    const service = createPaymentsService(repository);

    const paid = await service.markPaid("payment-1", {
      paidAt: new Date("2026-05-10T12:00:00.000Z"),
      paymentMethod: "pix"
    });

    expect(paid).toMatchObject({
      status: "paid",
      paymentMethod: "pix",
      paidAt: new Date("2026-05-10T12:00:00.000Z")
    });
  });

  it("requires cancellation flow instead of delete", async () => {
    const repository = createRepository();
    repository.seed(payment());
    const service = createPaymentsService(repository);

    const canceled = await service.cancel("payment-1", { cancelReason: "Lançamento duplicado" });

    expect(canceled.status).toBe("canceled");
    expect(canceled.cancelReason).toBe("Lançamento duplicado");
    expect(canceled.canceledAt).toBeInstanceOf(Date);
  });
});
