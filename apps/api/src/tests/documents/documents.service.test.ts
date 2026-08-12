import { describe, expect, it } from "vitest";
import type { DocumentStorage } from "../../modules/documents/document-storage.js";
import type { DocumentListFilters } from "../../modules/documents/documents.schemas.js";
import {
  createDocumentsService,
  documentMaxSizeBytes,
  DocumentCaseError,
  DocumentFileError,
  type DocumentRecord,
  type DocumentsRepository,
} from "../../modules/documents/documents.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const pdf = Buffer.from("%PDF-1.7 valid");

function record(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "document-1",
    clientId: "client-1",
    caseId: null,
    uploadedByUserId: "user-1",
    name: "Procuração",
    originalName: "procuracao.pdf",
    storageKey: "client-1/file.pdf",
    mimeType: "application/pdf",
    sizeBytes: pdf.length,
    checksumSha256: "hash",
    deletedAt: null,
    purgeAfter: null,
    clientName: "Ana",
    caseTitle: null,
    caseCnjNumber: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function setup() {
  const documents: DocumentRecord[] = [];
  const files = new Map<string, Buffer>();
  const storage: DocumentStorage = {
    async put(key, body) {
      files.set(key, body);
    },
    async get(key) {
      return { body: files.get(key)! };
    },
    async delete(key) {
      files.delete(key);
    },
  };
  const repository: DocumentsRepository = {
    async list(filters: DocumentListFilters) {
      return documents.filter(
        (item) =>
          !item.deletedAt &&
          (!filters.caseId || item.caseId === filters.caseId),
      );
    },
    async findById(id, includeDeleted = false) {
      return (
        documents.find(
          (item) => item.id === id && (includeDeleted || !item.deletedAt),
        ) ?? null
      );
    },
    async findClientById(id) {
      return ["client-1", "client-2"].includes(id) ? { id } : null;
    },
    async findCaseById(id) {
      return id === "case-1" ? { id, clientId: "client-1" } : null;
    },
    async create(data) {
      const item = record({ ...data, id: `document-${documents.length + 1}` });
      documents.push(item);
      return item;
    },
    async softDelete(id, deletedAt, purgeAfter) {
      const item = documents.find(
        (value) => value.id === id && !value.deletedAt,
      );
      if (!item) return null;
      item.deletedAt = deletedAt;
      item.purgeAfter = purgeAfter;
      return item;
    },
    async findDueForPurge(date) {
      return documents.filter(
        (item) => item.purgeAfter && item.purgeAfter <= date,
      );
    },
    async hardDelete(id) {
      documents.splice(
        documents.findIndex((item) => item.id === id),
        1,
      );
    },
  };
  return {
    service: createDocumentsService(repository, storage),
    repository,
    storage,
    documents,
    files,
  };
}

const upload = {
  clientId: "client-1",
  name: "Procuração",
  originalName: "procuracao.pdf",
  mimeType: "application/pdf",
  body: pdf,
  uploadedByUserId: "user-1",
};

describe("documents service", () => {
  it("rejects invalid configured file size", () => {
    expect(() => documentMaxSizeBytes("0")).toThrow(
      "DOCUMENT_MAX_SIZE_BYTES must be a positive integer",
    );
    expect(() => documentMaxSizeBytes("invalid")).toThrow(
      "DOCUMENT_MAX_SIZE_BYTES must be a positive integer",
    );
  });

  it("uploads validated content and metadata", async () => {
    const { service, files } = setup();
    const item = await service.upload(upload);
    expect(item).toMatchObject({
      clientId: "client-1",
      sizeBytes: pdf.length,
      originalName: "procuracao.pdf",
    });
    expect(item.checksumSha256).toHaveLength(64);
    expect(files.get(item.storageKey)).toEqual(pdf);
  });

  it("blocks a case from another client", async () => {
    const { service } = setup();
    await expect(
      service.upload({ ...upload, clientId: "client-2", caseId: "case-1" }),
    ).rejects.toBeInstanceOf(DocumentCaseError);
  });

  it("blocks content inconsistent with declared type", async () => {
    const { service } = setup();
    await expect(
      service.upload({ ...upload, body: Buffer.from("not a pdf") }),
    ).rejects.toBeInstanceOf(DocumentFileError);
  });

  it("blocks files above configured limit", async () => {
    const { repository, storage, files } = setup();
    const service = createDocumentsService(repository, storage, 1);
    await expect(service.upload(upload)).rejects.toThrow(
      "Document file is too large",
    );
    expect(files.size).toBe(0);
  });

  it("soft deletes immediately and permanently purges after 30 days", async () => {
    const { service, documents, files } = setup();
    const item = await service.upload(upload);
    await service.remove(item.id, now);
    expect(await service.list({ scope: "all" })).toEqual([]);
    expect(files.has(item.storageKey)).toBe(true);
    expect(await service.purge(new Date("2026-01-30T23:59:59.999Z"))).toEqual({
      purged: 0,
      failed: 0,
    });
    expect(await service.purge(new Date("2026-01-31T00:00:00.000Z"))).toEqual({
      purged: 1,
      failed: 0,
    });
    expect(files.has(item.storageKey)).toBe(false);
    expect(documents).toHaveLength(0);
  });

  it("continues purging other documents when one storage deletion fails", async () => {
    const { repository, storage, documents } = setup();
    const first = await createDocumentsService(repository, storage).upload(
      upload,
    );
    const second = await createDocumentsService(repository, storage).upload({
      ...upload,
      name: "Contrato",
    });
    await repository.softDelete(first.id, now, now);
    await repository.softDelete(second.id, now, now);
    const resilientStorage: DocumentStorage = {
      ...storage,
      async delete(key) {
        if (key === first.storageKey) throw new Error("OCI unavailable");
        await storage.delete(key);
      },
    };

    await expect(
      createDocumentsService(repository, resilientStorage).purge(now),
    ).resolves.toEqual({ purged: 1, failed: 1 });
    expect(documents.map((item) => item.id)).toEqual([first.id]);
  });
});
