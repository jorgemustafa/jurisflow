import type { CreateDocumentInput, DocumentListFilters } from "./documents.schemas.js";

export type DocumentRecord = {
  id: string;
  clientId: string;
  caseId: string | null;
  name: string;
  path: string;
  mimeType: string;
  clientName: string | null;
  caseTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DocumentsRepository = {
  list(filters: DocumentListFilters): Promise<DocumentRecord[]>;
  findClientById(id: string): Promise<{ id: string } | null>;
  findCaseById(id: string): Promise<{ id: string; clientId: string } | null>;
  create(data: CreateDocumentInput): Promise<DocumentRecord>;
};

export class DocumentClientError extends Error {
  constructor(message = "Client not found") {
    super(message);
  }
}

export class DocumentCaseError extends Error {
  constructor(message = "Case not found") {
    super(message);
  }
}

export function createDocumentsService(repository: DocumentsRepository) {
  async function ensureRelations(input: CreateDocumentInput) {
    const client = await repository.findClientById(input.clientId);
    if (!client) throw new DocumentClientError();

    if (!input.caseId) return;
    const legalCase = await repository.findCaseById(input.caseId);
    if (!legalCase) throw new DocumentCaseError();
    if (legalCase.clientId !== input.clientId) throw new DocumentCaseError("Case must belong to the selected client");
  }

  return {
    list(filters: DocumentListFilters) {
      return repository.list(filters);
    },

    async create(input: CreateDocumentInput) {
      await ensureRelations(input);
      return repository.create(input);
    }
  };
}
