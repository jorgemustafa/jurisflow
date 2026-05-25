import { describe, expect, it } from "vitest";
import type { CreateDocumentInput, DocumentListFilters } from "./documents.schemas.js";
import { createDocumentsService, DocumentCaseError, DocumentClientError, type DocumentRecord } from "./documents.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function documentRecord(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "document-1",
    clientId: "client-1",
    caseId: null,
    name: "Procuração",
    path: "local/client-1/procuracao.pdf",
    mimeType: "application/pdf",
    clientName: "Ana Silva",
    caseTitle: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository() {
  const documents: DocumentRecord[] = [];
  const cases = [{ id: "case-1", clientId: "client-1" }];

  return {
    async list(filters: DocumentListFilters) {
      return documents.filter((item) => !filters.caseId || item.caseId === filters.caseId);
    },
    async findClientById(id: string) {
      return ["client-1", "client-2"].includes(id) ? { id } : null;
    },
    async findCaseById(id: string) {
      return cases.find((item) => item.id === id) ?? null;
    },
    async create(data: CreateDocumentInput) {
      const item = documentRecord({ id: `document-${documents.length + 1}`, ...data, caseId: data.caseId ?? null });
      documents.push(item);
      return item;
    }
  };
}

describe("documents service", () => {
  it("creates client-only document metadata", async () => {
    const service = createDocumentsService(createRepository());

    const item = await service.create({
      clientId: "client-1",
      name: "Procuração",
      path: "local/client-1/procuracao.pdf",
      mimeType: "application/pdf"
    });

    expect(item).toMatchObject({ clientId: "client-1", caseId: null, name: "Procuração" });
  });

  it("creates document metadata linked to a case from the same client", async () => {
    const service = createDocumentsService(createRepository());

    const item = await service.create({
      clientId: "client-1",
      caseId: "case-1",
      name: "Sentença",
      path: "local/case-1/sentenca.pdf",
      mimeType: "application/pdf"
    });

    expect(item).toMatchObject({ clientId: "client-1", caseId: "case-1" });
  });

  it("blocks documents for missing clients", async () => {
    const service = createDocumentsService(createRepository());

    await expect(
      service.create({ clientId: "missing", name: "Documento", path: "local/documento.pdf", mimeType: "application/pdf" })
    ).rejects.toBeInstanceOf(DocumentClientError);
  });

  it("blocks linking a document to a case from another client", async () => {
    const service = createDocumentsService(createRepository());

    await expect(
      service.create({
        clientId: "client-2",
        caseId: "case-1",
        name: "Documento",
        path: "local/documento.pdf",
        mimeType: "application/pdf"
      })
    ).rejects.toBeInstanceOf(DocumentCaseError);
  });

  it("lists documents by case", async () => {
    const repository = createRepository();
    const service = createDocumentsService(repository);
    await service.create({ clientId: "client-1", name: "Cliente", path: "local/client.pdf", mimeType: "application/pdf" });
    await service.create({ clientId: "client-1", caseId: "case-1", name: "Processo", path: "local/case.pdf", mimeType: "application/pdf" });

    await expect(service.list({ scope: "all", caseId: "case-1" })).resolves.toMatchObject([{ name: "Processo" }]);
  });
});
