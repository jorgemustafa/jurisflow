import { describe, expect, it } from "vitest";
import { hashPassword } from "../../shared/security/password.js";
import { createAuthService, InvalidCredentialsError, InvalidTokenError } from "./auth.service.js";
import type { UserRecord } from "../users/users.service.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const secret = "test-secret";

function createUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    name: "Dra. Ana",
    email: "ana@jurisflow.test",
    passwordHash: null,
    role: "lawyer",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository(user: UserRecord | null) {
  return {
    async findById(id: string) {
      return user?.id === id ? user : null;
    },
    async findByEmail(email: string) {
      return user?.email === email ? user : null;
    }
  };
}

describe("auth service", () => {
  it("logs in active users with a valid password", async () => {
    const passwordHash = await hashPassword("password123");
    const service = createAuthService(createRepository(createUser({ passwordHash })), secret);

    const result = await service.login({ email: "ana@jurisflow.test", password: "password123" });

    expect(result.user).toMatchObject({ id: "user-1", email: "ana@jurisflow.test", role: "lawyer" });
    expect("passwordHash" in result.user).toBe(false);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("rejects invalid passwords", async () => {
    const passwordHash = await hashPassword("password123");
    const service = createAuthService(createRepository(createUser({ passwordHash })), secret);

    await expect(service.login({ email: "ana@jurisflow.test", password: "wrong-password" })).rejects.toBeInstanceOf(
      InvalidCredentialsError
    );
  });

  it("rejects inactive users", async () => {
    const passwordHash = await hashPassword("password123");
    const service = createAuthService(createRepository(createUser({ passwordHash, status: "inactive" })), secret);

    await expect(service.login({ email: "ana@jurisflow.test", password: "password123" })).rejects.toBeInstanceOf(
      InvalidCredentialsError
    );
  });

  it("refreshes tokens with a valid refresh token", async () => {
    const user = createUser({ passwordHash: await hashPassword("password123") });
    const service = createAuthService(createRepository(user), secret);
    const login = await service.login({ email: user.email, password: "password123" });

    const refreshed = await service.refresh(login.refreshToken);

    expect(refreshed.user.id).toBe(user.id);
    expect(refreshed.accessToken).toBeTruthy();
  });

  it("rejects access tokens in the refresh flow", async () => {
    const user = createUser({ passwordHash: await hashPassword("password123") });
    const service = createAuthService(createRepository(user), secret);
    const login = await service.login({ email: user.email, password: "password123" });

    await expect(service.refresh(login.accessToken)).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
