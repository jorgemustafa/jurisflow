import { describe, expect, it } from "vitest";
import { createAuthService, InvalidCredentialsError, InvalidTokenError } from "../../modules/auth/auth.service.js";
import type { UserRecord } from "../../modules/users/users.service.js";
import { hashPassword, verifyPassword } from "../../shared/security/password.js";

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
    oabNumber: null,
    oabState: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function createRepository(user: UserRecord | null) {
  let storedUser = user;
  return {
    async findById(id: string) {
      return storedUser?.id === id ? storedUser : null;
    },
    async findByEmail(email: string) {
      return storedUser?.email === email ? storedUser : null;
    },
    async updatePasswordHash(id: string, passwordHash: string) {
      if (!storedUser || storedUser.id !== id) throw new Error("User not found");
      storedUser = { ...storedUser, passwordHash };
      return storedUser;
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

  it("generates a password reset token for active users", async () => {
    const user = createUser({ passwordHash: await hashPassword("password123") });
    const service = createAuthService(createRepository(user), secret);

    const result = await service.requestPasswordReset({ email: user.email }, true);

    expect(result.message).toBe("If the email exists, password reset instructions were generated.");
    expect(result.resetToken).toBeTruthy();
  });

  it("does not generate password reset tokens for unknown emails", async () => {
    const service = createAuthService(createRepository(null), secret);

    const result = await service.requestPasswordReset({ email: "missing@jurisflow.test" }, true);

    expect(result).toEqual({ message: "If the email exists, password reset instructions were generated." });
  });

  it("resets the password with a valid reset token", async () => {
    const user = createUser({ passwordHash: await hashPassword("password123") });
    const repository = createRepository(user);
    const service = createAuthService(repository, secret);
    const reset = await service.requestPasswordReset({ email: user.email }, true);

    await service.resetPassword({ resetToken: reset.resetToken!, password: "newpass123" });

    const updated = await repository.findById(user.id);
    await expect(verifyPassword("newpass123", updated!.passwordHash!)).resolves.toBe(true);
  });

  it("rejects access tokens in the password reset flow", async () => {
    const user = createUser({ passwordHash: await hashPassword("password123") });
    const service = createAuthService(createRepository(user), secret);
    const login = await service.login({ email: user.email, password: "password123" });

    await expect(service.resetPassword({ resetToken: login.accessToken, password: "newpass123" })).rejects.toBeInstanceOf(
      InvalidTokenError
    );
  });
});
