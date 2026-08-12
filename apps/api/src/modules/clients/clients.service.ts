import type { ClientListFilters, ClientStatus, ClientType, CreateClientInput, UpdateClientInput } from "./clients.schemas.js";
import { isValidDocumentForType } from "./clients.schemas.js";

export type ClientRecord = {
  id: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  document: string | null;
  rg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ClientsRepository = {
  list(filters: ClientListFilters): Promise<ClientRecord[]>;
  findById(id: string): Promise<ClientRecord | null>;
  findByDocument(document: string, excludeId?: string): Promise<ClientRecord | null>;
  create(data: CreateClientInput): Promise<ClientRecord>;
  update(id: string, data: UpdateClientInput): Promise<ClientRecord>;
  updateStatus(id: string, status: ClientStatus): Promise<ClientRecord>;
  delete(id: string): Promise<void>;
};

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found");
  }
}

export class ClientDocumentConflictError extends Error {
  constructor() {
    super("Client document already exists");
  }
}

export class ClientDocumentTypeError extends Error {
  constructor() {
    super("Document is invalid for client type");
  }
}

export function createClientsService(repository: ClientsRepository) {
  async function ensureUniqueDocument(document: string | null | undefined, excludeId?: string) {
    if (!document) return;
    const existing = await repository.findByDocument(document, excludeId);
    if (existing) throw new ClientDocumentConflictError();
  }

  function ensureDocumentMatchesType(type: ClientType, document: string | null | undefined) {
    if (document && !isValidDocumentForType(type, document)) throw new ClientDocumentTypeError();
  }

  return {
    list(filters: ClientListFilters) {
      return repository.list(filters);
    },

    async get(id: string) {
      const client = await repository.findById(id);
      if (!client) throw new ClientNotFoundError();
      return client;
    },

    async create(input: CreateClientInput) {
      await ensureUniqueDocument(input.document);
      return repository.create(input);
    },

    async update(id: string, input: UpdateClientInput) {
      const current = await repository.findById(id);
      if (!current) throw new ClientNotFoundError();

      const nextType = input.type ?? current.type;
      const nextDocument = input.document === undefined ? current.document : input.document;

      ensureDocumentMatchesType(nextType, nextDocument);
      if (nextDocument !== current.document) await ensureUniqueDocument(nextDocument, id);

      return repository.update(id, input);
    },

    async updateStatus(id: string, status: ClientStatus) {
      const current = await repository.findById(id);
      if (!current) throw new ClientNotFoundError();
      return repository.updateStatus(id, status);
    },

    async delete(id: string) {
      const current = await repository.findById(id);
      if (!current) throw new ClientNotFoundError();
      await repository.delete(id);
    }
  };
}
