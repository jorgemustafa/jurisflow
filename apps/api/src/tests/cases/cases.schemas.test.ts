import { describe, expect, it } from "vitest";
import { createCaseSchema, listCasesQuerySchema, updateCaseSchema } from "../../modules/cases/cases.schemas.js";

describe("case schemas", () => {
  it("accepts minimal case creation input", () => {
    const input = createCaseSchema.parse({
      clientId: "11111111-1111-4111-8111-111111111111",
      title: "Ação penal"
    });

    expect(input).toMatchObject({
      clientId: "11111111-1111-4111-8111-111111111111",
      title: "Ação penal"
    });
  });

  it("normalizes CNJ numbers to digits", () => {
    const input = createCaseSchema.parse({
      clientId: "11111111-1111-4111-8111-111111111111",
      title: "Ação penal",
      cnjNumber: "0000001-23.2026.8.26.0001"
    });

    expect(input.cnjNumber).toBe("00000012320268260001");
  });

  it("rejects CNJ numbers outside 20 digits", () => {
    expect(() =>
      createCaseSchema.parse({
        clientId: "11111111-1111-4111-8111-111111111111",
        title: "Ação penal",
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
        cnjNumber: "0000001-23.2026.8.26.0001"
      })
    ).toThrow();
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
