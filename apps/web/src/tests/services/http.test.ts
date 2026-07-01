import { describe, expect, it } from "vitest";
import {
  backendErrorMessage,
  issueMessage,
  responseErrorMessage,
} from "src/services/http.js";

describe("frontend API errors", () => {
  it("translates validation issues instead of exposing Zod messages", () => {
    expect(
      issueMessage({
        code: "invalid_enum_value",
        message:
          "Invalid enum value. Expected 'initial' | 'appeal', received ''",
      }),
    ).toBe("Selecione uma opção válida.");
  });

  it("translates known business errors", () => {
    expect(
      responseErrorMessage(409, { message: "Case CNJ already exists" }),
    ).toBe("Já existe um processo com este número CNJ.");
  });

  it("hides unknown backend details", () => {
    expect(
      responseErrorMessage(500, {
        message: "Invalid db.caseImportBatch.create() invocation",
      }),
    ).toBe("Ocorreu um erro interno. Tente novamente.");
  });

  it("hides unknown errors stored in API results", () => {
    expect(backendErrorMessage("connection refused", "Falha na sincronização")).toBe(
      "Falha na sincronização",
    );
  });
});
