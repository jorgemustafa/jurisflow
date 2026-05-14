import { describe, expect, it } from "vitest";
import type { CreateUserInput, UpdateUserInput, UserListFilters } from "./users.schemas.js";
import { UserEmailConflictError, createUsersService, type UserRecord } from "./users.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function createRepository(seed: UserRecord[] = []) {
  const users = [...seed];

  return {
    async list(filters: UserListFilters) {
      return users.filter((user) => filters.status === "all" || user.status === filters.status);
    },
    async findById(id: string) {
      return users.find((user) => user.id === id) ?? null;
    },
    async findByEmail(email: string, excludeId?: string) {
      return users.find((user) => user.email === email && user.id !== excludeId) ?? null;
    },
    async create(data: CreateUserInput) {
      const user: UserRecord = {
        id: `user-${users.length + 1}`,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        role: data.role ?? "lawyer",
        status: "active",
        createdAt: now,
        updatedAt: now
      };
      users.push(user);
      return user;
    },
    async update(id: string, data: UpdateUserInput) {
      const user = users.find((item) => item.id === id);
      if (!user) throw new Error("test setup error");
      Object.assign(user, data, { updatedAt: now });
      return user;
    }
  };
}

describe("users service", () => {
  it("creates a lawyer user without requiring a password hash", async () => {
    const service = createUsersService(createRepository());

    const user = await service.create({ name: "Dra. Ana", email: "ana@jurisflow.test", role: "lawyer" });

    expect(user).toMatchObject({
      name: "Dra. Ana",
      email: "ana@jurisflow.test",
      role: "lawyer",
      status: "active",
      passwordHash: null
    });
  });

  it("rejects duplicate emails", async () => {
    const repository = createRepository([
      {
        id: "user-1",
        name: "Dra. Ana",
        email: "ana@jurisflow.test",
        passwordHash: null,
        role: "lawyer",
        status: "active",
        createdAt: now,
        updatedAt: now
      }
    ]);
    const service = createUsersService(repository);

    await expect(service.create({ name: "Ana 2", email: "ana@jurisflow.test", role: "lawyer" })).rejects.toBeInstanceOf(
      UserEmailConflictError
    );
  });
});
