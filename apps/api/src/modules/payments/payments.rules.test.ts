import { describe, expect, it } from "vitest";
import type { CreatePaymentData, PaymentRecord } from "./payments.service.js";
import {
  PaymentCaseError,
  PaymentClientError,
  PaymentNotFoundError,
  PaymentStatusError,
  buildInstallments,
  createPaymentsService
} from "./payments.service.js";
import type { PaymentListFilters } from "./payments.schemas.js";

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
      const item = payment({ id: `payment-${payments.length + 1}`, ...data, caseId: data.caseId ?? null });
      payments.push(item);
      return item;
    },
    async createCaseSchedule(_caseId: string, _totalFeeAmountCents: number, data: CreatePaymentData[]) {
      for (const item of data) {
        payments.push(payment({ id: `payment-${payments.length + 1}`, ...item, caseId: item.caseId ?? null }));
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

describe("buildInstallments", () => {
  it("generates a single full-payment installment when count is 1", () => {
    const installments = buildInstallments("case-1", "client-1", {
      totalFeeAmountCents: 250000,
      installmentCount: 1,
      firstDueDate: new Date("2026-06-10T12:00:00.000Z")
    });

    expect(installments).toHaveLength(1);
    expect(installments[0]).toMatchObject({
      amountCents: 250000,
      installmentNumber: 1,
      installmentTotal: 1,
      source: "generated"
    });
    expect(installments[0].paymentScheduleId).toBeTruthy();
  });

  it("keeps the sum of generated installments equal to the total fee", () => {
    const installments = buildInstallments("case-1", "client-1", {
      totalFeeAmountCents: 10000,
      installmentCount: 3,
      firstDueDate: new Date("2026-01-15T12:00:00.000Z")
    });

    const sum = installments.reduce((total, item) => total + item.amountCents, 0);
    expect(sum).toBe(10000);
  });

  it("splits evenly with no remainder when the total divides cleanly", () => {
    const installments = buildInstallments("case-1", "client-1", {
      totalFeeAmountCents: 9000,
      installmentCount: 3,
      firstDueDate: new Date("2026-01-15T12:00:00.000Z")
    });

    expect(installments.map((item) => item.amountCents)).toEqual([3000, 3000, 3000]);
  });

  it("numbers every installment with its position and total", () => {
    const installments = buildInstallments("case-1", "client-1", {
      totalFeeAmountCents: 9000,
      installmentCount: 3,
      firstDueDate: new Date("2026-01-15T12:00:00.000Z")
    });

    expect(installments.map((item) => `${item.installmentNumber}/${item.installmentTotal}`)).toEqual(["1/3", "2/3", "3/3"]);
  });
});

describe("payments service - create guards", () => {
  it("rejects payments for a client that does not exist", async () => {
    const service = createPaymentsService(createRepository());

    await expect(
      service.create({
        clientId: "ghost",
        description: "Consulta",
        amountCents: 50000,
        dueDate: new Date("2026-06-10T12:00:00.000Z")
      })
    ).rejects.toBeInstanceOf(PaymentClientError);
  });

  it("rejects a generated schedule for a case that does not exist", async () => {
    const service = createPaymentsService(createRepository());

    await expect(
      service.createCaseSchedule("missing-case", {
        totalFeeAmountCents: 100000,
        installmentCount: 2,
        firstDueDate: new Date("2026-06-10T12:00:00.000Z")
      })
    ).rejects.toBeInstanceOf(PaymentCaseError);
  });
});

describe("payments service - edit restrictions by status and source", () => {
  it("allows correcting paidAt on a paid payment", async () => {
    const repository = createRepository();
    repository.seed(payment({ status: "paid", paidAt: now }));
    const service = createPaymentsService(repository);

    const updated = await service.update("payment-1", { paidAt: new Date("2026-05-01T12:00:00.000Z") });
    expect(updated.paidAt).toEqual(new Date("2026-05-01T12:00:00.000Z"));
  });

  it("blocks editing amount, due date, or description on a paid payment", async () => {
    const repository = createRepository();
    repository.seed(payment({ status: "paid", paidAt: now }));
    const service = createPaymentsService(repository);

    await expect(service.update("payment-1", { amountCents: 1 })).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(service.update("payment-1", { dueDate: now })).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(service.update("payment-1", { description: "novo" })).rejects.toBeInstanceOf(PaymentStatusError);
  });

  it("allows editing notes and cancel reason on a canceled payment", async () => {
    const repository = createRepository();
    repository.seed(payment({ status: "canceled", canceledAt: now, cancelReason: "duplicado" }));
    const service = createPaymentsService(repository);

    const updated = await service.update("payment-1", { notes: "ajuste", cancelReason: "duplicado corrigido" });
    expect(updated.notes).toBe("ajuste");
    expect(updated.cancelReason).toBe("duplicado corrigido");
  });

  it("blocks editing financial fields on a canceled payment", async () => {
    const repository = createRepository();
    repository.seed(payment({ status: "canceled", canceledAt: now }));
    const service = createPaymentsService(repository);

    await expect(service.update("payment-1", { amountCents: 1 })).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(service.update("payment-1", { dueDate: now })).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(service.update("payment-1", { paidAt: now })).rejects.toBeInstanceOf(PaymentStatusError);
  });

  it("forces pending receipts to go through the paid action", async () => {
    const repository = createRepository();
    repository.seed(payment());
    const service = createPaymentsService(repository);

    await expect(service.update("payment-1", { paidAt: now })).rejects.toBeInstanceOf(PaymentStatusError);
  });

  it("allows editing the amount of a pending manual payment", async () => {
    const repository = createRepository();
    repository.seed(payment({ source: "manual" }));
    const service = createPaymentsService(repository);

    const updated = await service.update("payment-1", { amountCents: 80000 });
    expect(updated.amountCents).toBe(80000);
  });
});

describe("payments service - mark paid", () => {
  it("defaults paidAt to the current time when omitted", async () => {
    const repository = createRepository();
    repository.seed(payment());
    const service = createPaymentsService(repository);

    const before = Date.now();
    const paid = await service.markPaid("payment-1", { paymentMethod: "pix" });
    const after = Date.now();

    expect(paid.status).toBe("paid");
    expect(paid.paidAt).toBeInstanceOf(Date);
    expect((paid.paidAt as Date).getTime()).toBeGreaterThanOrEqual(before);
    expect((paid.paidAt as Date).getTime()).toBeLessThanOrEqual(after);
  });

  it("refuses to mark a canceled payment as paid", async () => {
    const repository = createRepository();
    repository.seed(payment({ status: "canceled", canceledAt: now }));
    const service = createPaymentsService(repository);

    await expect(service.markPaid("payment-1", { paymentMethod: "pix" })).rejects.toBeInstanceOf(PaymentStatusError);
  });

  it("throws when the payment does not exist", async () => {
    const service = createPaymentsService(createRepository());
    await expect(service.markPaid("nope", { paymentMethod: "pix" })).rejects.toBeInstanceOf(PaymentNotFoundError);
  });
});

describe("payments service - cancel", () => {
  it("sets canceledAt and the cancel reason, keeping existing notes", async () => {
    const repository = createRepository();
    repository.seed(payment({ notes: "obs original" }));
    const service = createPaymentsService(repository);

    const canceled = await service.cancel("payment-1", { cancelReason: "Acordo desfeito" });

    expect(canceled.status).toBe("canceled");
    expect(canceled.cancelReason).toBe("Acordo desfeito");
    expect(canceled.canceledAt).toBeInstanceOf(Date);
    expect(canceled.notes).toBe("obs original");
  });

  it("refuses to cancel an already canceled payment", async () => {
    const repository = createRepository();
    repository.seed(payment({ status: "canceled", canceledAt: now }));
    const service = createPaymentsService(repository);

    await expect(service.cancel("payment-1", { cancelReason: "outra vez" })).rejects.toBeInstanceOf(PaymentStatusError);
  });
});
