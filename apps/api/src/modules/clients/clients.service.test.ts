import { describe, expect, it } from "vitest";
import type { ClientListFilters, ClientStatus, CreateClientInput, UpdateClientInput } from "./clients.schemas.js";
import { ClientDocumentConflictError, ClientDocumentTypeError, createClientsService, type ClientRecord } from "./clients.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function createRepository(seed: ClientRecord[] = []) {
  const clients = [...seed];

  return {
    clients,

    async list(filters: ClientListFilters) {
      return clients.filter((client) => filters.status === "all" || client.status === filters.status);
    },

    async findById(id: string) {
      return clients.find((client) => client.id === id) ?? null;
    },

    async findByDocument(document: string, excludeId?: string) {
      return clients.find((client) => client.document === document && client.id !== excludeId) ?? null;
    },

    async create(data: CreateClientInput) {
      const client: ClientRecord = {
        id: `client-${clients.length + 1}`,
        type: data.type,
        status: "active",
        name: data.name,
        document: data.document ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
        createdAt: now,
        updatedAt: now
      };
      clients.push(client);
      return client;
    },

    async update(id: string, data: UpdateClientInput) {
      const client = clients.find((item) => item.id === id);
      if (!client) throw new Error("test setup error");
      Object.assign(client, data, { updatedAt: now });
      return client;
    },

    async updateStatus(id: string, status: ClientStatus) {
      const client = clients.find((item) => item.id === id);
      if (!client) throw new Error("test setup error");
      client.status = status;
      client.updatedAt = now;
      return client;
    }
  };
}

describe("clients service", () => {
  it("creates an individual with only type and name", async () => {
    const repository = createRepository();
    const service = createClientsService(repository);

    const client = await service.create({ type: "individual", name: "Maria Silva" });

    expect(client).toMatchObject({
      type: "individual",
      status: "active",
      name: "Maria Silva",
      document: null
    });
  });

  it("creates a company with only type and name", async () => {
    const repository = createRepository();
    const service = createClientsService(repository);

    const client = await service.create({ type: "company", name: "Mustafa LTDA" });

    expect(client).toMatchObject({
      type: "company",
      status: "active",
      name: "Mustafa LTDA"
    });
  });

  it("rejects duplicate documents when provided", async () => {
    const repository = createRepository([
      {
        id: "client-1",
        type: "individual",
        status: "active",
        name: "Maria Silva",
        document: "52998224725",
        email: null,
        phone: null,
        address: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
    const service = createClientsService(repository);

    await expect(service.create({ type: "individual", name: "Maria 2", document: "52998224725" })).rejects.toBeInstanceOf(
      ClientDocumentConflictError
    );
  });

  it("allows duplicate names when document is empty", async () => {
    const repository = createRepository();
    const service = createClientsService(repository);

    await service.create({ type: "individual", name: "Maria Silva" });
    await service.create({ type: "individual", name: "Maria Silva" });

    expect(repository.clients).toHaveLength(2);
  });

  it("allows changing type when document is empty", async () => {
    const repository = createRepository([
      {
        id: "client-1",
        type: "individual",
        status: "active",
        name: "Cliente",
        document: null,
        email: null,
        phone: null,
        address: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
    const service = createClientsService(repository);

    const client = await service.update("client-1", { type: "company" });

    expect(client.type).toBe("company");
  });

  it("blocks changing type when the existing document is invalid for the next type", async () => {
    const repository = createRepository([
      {
        id: "client-1",
        type: "individual",
        status: "active",
        name: "Cliente",
        document: "52998224725",
        email: null,
        phone: null,
        address: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
    const service = createClientsService(repository);

    await expect(service.update("client-1", { type: "company" })).rejects.toBeInstanceOf(ClientDocumentTypeError);
  });

  it("inactivates and reactivates clients", async () => {
    const repository = createRepository([
      {
        id: "client-1",
        type: "individual",
        status: "active",
        name: "Cliente",
        document: null,
        email: null,
        phone: null,
        address: null,
        notes: null,
        createdAt: now,
        updatedAt: now
      }
    ]);
    const service = createClientsService(repository);

    expect((await service.updateStatus("client-1", "inactive")).status).toBe("inactive");
    expect((await service.updateStatus("client-1", "active")).status).toBe("active");
  });
});
