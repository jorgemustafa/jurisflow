import { describe, expect, it } from "vitest";
import { createCaseSchema, listCasesQuerySchema, updateCaseSchema } from "../../modules/cases/cases.schemas.js";

describe("case schemas", () => {
  const finance = {
    totalFeeAmountCents: 150000,
    entryAmountCents: 20000,
    installmentAmountCents: 50000,
    firstDueDate: "2026-07-10",
    entryPaymentMethod: "pix"
  };

  it("requires valid finance data on case creation", () => {
    const input = createCaseSchema.parse({
      clientId: "11111111-1111-4111-8111-111111111111",
      title: "Ação penal",
      finance
    });

    expect(input).toMatchObject({
      clientId: "11111111-1111-4111-8111-111111111111",
      title: "Ação penal",
      finance
    });
  });

  it("normalizes CNJ numbers to digits", () => {
    const input = createCaseSchema.parse({
      clientId: "11111111-1111-4111-8111-111111111111",
      title: "Ação penal",
      finance,
      cnjNumber: "0000001-23.2026.8.26.0001"
    });

    expect(input.cnjNumber).toBe("00000012320268260001");
  });

  it("rejects CNJ numbers outside 20 digits", () => {
    expect(() =>
      createCaseSchema.parse({
        clientId: "11111111-1111-4111-8111-111111111111",
        title: "Ação penal",
        finance,
        cnjNumber: "123"
      })
    ).toThrow();
  });

  it("rejects CNJ for extrajudicial cases", () => {
    expect(() =>
      createCaseSchema.parse({
        clientId: "11111111-1111-4111-8111-111111111111",
        caseType: "extrajudicial",
        title: "Acordo",
        finance,
        cnjNumber: "0000001-23.2026.8.26.0001"
      })
    ).toThrow();
  });

  it("rejects missing finance and an entry equal to the total", () => {
    expect(() => createCaseSchema.parse({ clientId: "11111111-1111-4111-8111-111111111111", title: "Sem acordo" })).toThrow();
    expect(() => createCaseSchema.parse({ clientId: "11111111-1111-4111-8111-111111111111", title: "Caso", finance: { ...finance, entryAmountCents: finance.totalFeeAmountCents } })).toThrow();
  });

  it("allows clearing optional case fields", () => {
    const input = updateCaseSchema.parse({
      responsibleUserId: "",
      cnjNumber: "",
      description: "",
      openedAt: null,
      closedAt: null
    });

    expect(input).toEqual({
      responsibleUserId: null,
      cnjNumber: null,
      description: null,
      openedAt: null,
      closedAt: null
    });
  });

  it("defaults case listing to active status", () => {
    expect(listCasesQuerySchema.parse({})).toEqual({ status: "active" });
  });
});
