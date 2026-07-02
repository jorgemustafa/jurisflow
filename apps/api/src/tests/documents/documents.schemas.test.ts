import { describe, expect, it } from "vitest";
import { createDocumentSchema, listDocumentsQuerySchema } from "../../modules/documents/documents.schemas.js";

describe("document schemas", () => {
  it("accepts valid document metadata", () => {
    const input = createDocumentSchema.parse({
      clientId: "11111111-1111-4111-8111-111111111111",
      name: " Procuração ",
      path: "local/client-1/procuracao.pdf",
      mimeType: "application/pdf"
    });

    expect(input).toEqual({
      clientId: "11111111-1111-4111-8111-111111111111",
      name: "Procuração",
      path: "local/client-1/procuracao.pdf",
      mimeType: "application/pdf"
    });
  });

  it("rejects invalid MIME types", () => {
    expect(() =>
      createDocumentSchema.parse({
        clientId: "11111111-1111-4111-8111-111111111111",
        name: "Documento",
        path: "local/documento.pdf",
        mimeType: "pdf"
      })
    ).toThrow();
  });

  it("defaults document listing to all scopes", () => {
    expect(listDocumentsQuerySchema.parse({})).toEqual({ scope: "all" });
  });
});
