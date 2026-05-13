import { describe, expect, it } from "vitest";
import { createClientsService } from "./clients.service.js";

describe("clients service", () => {
  it("creates a client through the repository", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const repository = {
      async list() {
        return [];
      },
      async create(data: { name: string }) {
        return {
          id: "client-1",
          name: data.name,
          document: null,
          email: null,
          phone: null,
          createdAt
        };
      }
    };

    const service = createClientsService(repository);
    const client = await service.create({ name: "Maria Silva" });

    expect(client).toEqual({
      id: "client-1",
      name: "Maria Silva",
      document: null,
      email: null,
      phone: null,
      createdAt
    });
  });
}
);
