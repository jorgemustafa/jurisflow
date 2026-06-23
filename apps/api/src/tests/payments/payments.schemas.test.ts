import { describe, expect, it } from "vitest";
import {
  cancelPaymentSchema,
  createPaymentSchema,
  createPaymentScheduleSchema,
  listPaymentsQuerySchema,
  markPaymentPaidSchema,
  updatePaymentSchema
} from "../../modules/payments/payments.schemas.js";

const clientId = "11111111-1111-1111-1111-111111111111";

describe("createPaymentSchema", () => {
  it("accepts a valid manual payment and coerces the due date", () => {
    const parsed = createPaymentSchema.parse({
      clientId,
      description: "Consulta inicial",
      amountCents: 50000,
      dueDate: "2026-06-10T12:00:00.000Z"
    });

    expect(parsed.clientId).toBe(clientId);
    expect(parsed.dueDate).toBeInstanceOf(Date);
    expect(parsed.caseId).toBeUndefined();
  });

  it("normalizes an empty notes string to undefined", () => {
    const parsed = createPaymentSchema.parse({
      clientId,
      description: "Consulta",
      amountCents: 50000,
      dueDate: "2026-06-10T12:00:00.000Z",
      notes: "   "
    });
    expect(parsed.notes).toBeUndefined();
  });

  it("rejects a non-positive amount", () => {
    expect(() =>
      createPaymentSchema.parse({ clientId, description: "Consulta", amountCents: 0, dueDate: "2026-06-10" })
    ).toThrow();
  });

  it("rejects a description shorter than two characters", () => {
    expect(() =>
      createPaymentSchema.parse({ clientId, description: "x", amountCents: 1000, dueDate: "2026-06-10" })
    ).toThrow();
  });

  it("rejects a non-uuid client id", () => {
    expect(() =>
      createPaymentSchema.parse({ clientId: "not-a-uuid", description: "Consulta", amountCents: 1000, dueDate: "2026-06-10" })
    ).toThrow();
  });
});

describe("markPaymentPaidSchema", () => {
  it("requires a payment method", () => {
    expect(() => markPaymentPaidSchema.parse({})).toThrow();
  });

  it("accepts a method with an optional paidAt", () => {
    const parsed = markPaymentPaidSchema.parse({ paymentMethod: "pix" });
    expect(parsed.paymentMethod).toBe("pix");
    expect(parsed.paidAt).toBeUndefined();
  });

  it("rejects an unknown payment method", () => {
    expect(() => markPaymentPaidSchema.parse({ paymentMethod: "bitcoin" })).toThrow();
  });
});

describe("cancelPaymentSchema", () => {
  it("requires a cancel reason", () => {
    expect(() => cancelPaymentSchema.parse({})).toThrow();
    expect(() => cancelPaymentSchema.parse({ cancelReason: "x" })).toThrow();
  });

  it("accepts a valid reason", () => {
    const parsed = cancelPaymentSchema.parse({ cancelReason: "Lançamento duplicado" });
    expect(parsed.cancelReason).toBe("Lançamento duplicado");
  });
});

describe("createPaymentScheduleSchema", () => {
  it("accepts a single installment full payment", () => {
    const parsed = createPaymentScheduleSchema.parse({
      totalFeeAmountCents: 100000,
      installmentCount: 1,
      firstDueDate: "2026-06-10"
    });
    expect(parsed.installmentCount).toBe(1);
  });

  it("rejects an installment count below one", () => {
    expect(() =>
      createPaymentScheduleSchema.parse({ totalFeeAmountCents: 100000, installmentCount: 0, firstDueDate: "2026-06-10" })
    ).toThrow();
  });

  it("rejects a non-positive total fee", () => {
    expect(() =>
      createPaymentScheduleSchema.parse({ totalFeeAmountCents: -1, installmentCount: 2, firstDueDate: "2026-06-10" })
    ).toThrow();
  });
});

describe("listPaymentsQuerySchema", () => {
  it("defaults the status filter to pending", () => {
    const parsed = listPaymentsQuerySchema.parse({});
    expect(parsed.status).toBe("pending");
    expect(parsed.overdue).toBeUndefined();
  });

  it("transforms the overdue flag into a boolean", () => {
    expect(listPaymentsQuerySchema.parse({ overdue: "true" }).overdue).toBe(true);
    expect(listPaymentsQuerySchema.parse({ overdue: "false" }).overdue).toBe(false);
  });

  it("allows the 'all' status sentinel", () => {
    expect(listPaymentsQuerySchema.parse({ status: "all" }).status).toBe("all");
  });
});

describe("updatePaymentSchema", () => {
  it("requires at least one field", () => {
    expect(() => updatePaymentSchema.parse({})).toThrow();
  });

  it("accepts a partial update", () => {
    const parsed = updatePaymentSchema.parse({ description: "Atualizado" });
    expect(parsed.description).toBe("Atualizado");
  });
});
