import { describe, expect, it } from "vitest";
import type { PaymentListFilters } from "../../modules/payments/payments.schemas.js";
import {
  PaymentClientError,
  PaymentScheduleError,
  PaymentStatusError,
  buildCasePayments,
  createPaymentsService,
  type CreatePaymentData,
  type PaymentRecord,
} from "../../modules/payments/payments.service.js";

const now = new Date("2026-06-05T12:00:00.000Z");
const finance = {
  totalFeeAmountCents: 150000,
  entryAmountCents: 20000,
  installmentAmountCents: 50000,
  firstDueDate: "2026-07-31",
  entryPaymentMethod: "pix" as const,
};

function payment(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
  return {
    id: "payment-1",
    clientId: "client-1",
    caseId: "case-1",
    paymentScheduleId: null,
    source: "manual",
    description: "Honorários",
    amountCents: 100000,
    dueDate: new Date("2026-07-10T12:00:00.000Z"),
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
    ...overrides,
  };
}

function createRepository() {
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
      return id === "case-1"
        ? { id, clientId: "client-1", totalFeeAmountCents: 150000 }
        : null;
    },
    async create(data: CreatePaymentData) {
      const item = payment({
        ...data,
        id: `payment-${payments.length + 1}`,
        caseId: data.caseId ?? null,
        paymentScheduleId: data.paymentScheduleId ?? null,
      });
      payments.push(item);
      return item;
    },
    async update(id: string, data: Partial<PaymentRecord>) {
      const item = payments.find((current) => current.id === id);
      if (!item) throw new Error("test setup error");
      Object.assign(item, data);
      return item;
    },
    seed(item: PaymentRecord) {
      payments.push(item);
    },
  };
}

describe("fixed case payment schedule", () => {
  it("creates a paid entry and fixed installments with a smaller final payment", () => {
    const payments = buildCasePayments(
      "case-1",
      "client-1",
      finance,
      now,
      "schedule-1",
    );

    expect(payments.map((item) => item.amountCents)).toEqual([
      20000, 50000, 50000, 30000,
    ]);
    expect(
      payments.map(
        (item) => `${item.installmentNumber}/${item.installmentTotal}`,
      ),
    ).toEqual(["0/3", "1/3", "2/3", "3/3"]);
    expect(payments[0]).toMatchObject({
      status: "paid",
      paymentMethod: "pix",
      paidAt: now,
      paymentScheduleId: "schedule-1",
    });
    expect(payments.reduce((total, item) => total + item.amountCents, 0)).toBe(
      finance.totalFeeAmountCents,
    );
  });

  it("keeps the chosen amount when the balance divides exactly", () => {
    const payments = buildCasePayments(
      "case-1",
      "client-1",
      { ...finance, entryAmountCents: 50000 },
      now,
    );
    expect(payments.map((item) => item.amountCents)).toEqual([
      50000, 50000, 50000,
    ]);
  });

  it("repeats the due day and clamps shorter months", () => {
    const payments = buildCasePayments(
      "case-1",
      "client-1",
      { ...finance, firstDueDate: "2026-07-31" },
      now,
    );
    expect(
      payments.slice(1).map((item) => item.dueDate.toISOString().slice(0, 10)),
    ).toEqual(["2026-07-31", "2026-08-31", "2026-09-30"]);
  });

  it("rejects a first due date outside the next calendar month", () => {
    expect(() =>
      buildCasePayments(
        "case-1",
        "client-1",
        { ...finance, firstDueDate: "2026-08-10" },
        now,
      ),
    ).toThrow(PaymentScheduleError);
  });
});

describe("fixed generated payments", () => {
  it("allows notes but blocks contract field changes", async () => {
    const repository = createRepository();
    repository.seed(
      payment({ source: "generated", paymentScheduleId: "schedule-1" }),
    );
    const service = createPaymentsService(repository);

    await expect(
      service.update("payment-1", { amountCents: 90000 }),
    ).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(
      service.update("payment-1", { dueDate: now }),
    ).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(
      service.update("payment-1", { description: "Alterado" }),
    ).rejects.toBeInstanceOf(PaymentStatusError);
    await expect(
      service.update("payment-1", { notes: "Cobrança realizada" }),
    ).resolves.toMatchObject({ notes: "Cobrança realizada" });
  });

  it("blocks generated cancellation and preserves manual cancellation", async () => {
    const repository = createRepository();
    const service = createPaymentsService(repository);
    repository.seed(payment({ source: "generated" }));
    await expect(
      service.cancel("payment-1", { cancelReason: "Teste" }),
    ).rejects.toBeInstanceOf(PaymentStatusError);

    repository.payments[0].source = "manual";
    await expect(
      service.cancel("payment-1", { cancelReason: "Duplicado" }),
    ).resolves.toMatchObject({ status: "canceled" });
  });

  it("rejects manual payments for a missing client", async () => {
    const service = createPaymentsService(createRepository());
    await expect(
      service.create({
        clientId: "missing",
        description: "Consulta",
        amountCents: 1000,
        dueDate: now,
      }),
    ).rejects.toBeInstanceOf(PaymentClientError);
  });
});
