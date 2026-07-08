import { describe, expect, it } from "vitest";
import { createDocumentSchema, listDocumentsQuerySchema } from "../../modules/documents/documents.schemas.js";

describe("document schemas", () => {
  it("normalizes upload metadata", () => {
    expect(createDocumentSchema.parse({ clientId: "11111111-1111-4111-8111-111111111111", name: " Procuração " }))
      .toEqual({ clientId: "11111111-1111-4111-8111-111111111111", name: "Procuração" });
  });

  it("defaults listing to active documents from all scopes", () => {
    expect(listDocumentsQuerySchema.parse({})).toEqual({ scope: "all" });
  });
});
