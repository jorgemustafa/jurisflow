import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { InvalidTokenError } from "../../modules/auth/auth.service.js";
import type { UserRecord } from "../../modules/users/users.service.js";
import { createRequireAuth } from "./auth.js";

const now = new Date("2026-01-01T00:00:00.000Z");

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

function createReply() {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn((body: unknown) => body)
  };
  return reply as unknown as FastifyReply & { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
}

describe("auth middleware", () => {
  it("attaches the active user for allowed roles", async () => {
    const requireAuth = createRequireAuth(async () => createUser());
    const request = { headers: { authorization: "Bearer token" } } as FastifyRequest;
    const reply = createReply();

    await requireAuth(["lawyer"])(request, reply);

    expect(request.user).toMatchObject({ id: "user-1", role: "lawyer" });
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("rejects authenticated users without the required role", async () => {
    const requireAuth = createRequireAuth(async () => createUser({ role: "assistant" }));
    const request = { headers: { authorization: "Bearer token" } } as FastifyRequest;
    const reply = createReply();

    await requireAuth(["admin"])(request, reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("rejects missing access tokens", async () => {
    const requireAuth = createRequireAuth(async () => {
      throw new InvalidTokenError();
    });
    const request = { headers: {} } as FastifyRequest;
    const reply = createReply();

    await requireAuth()(request, reply);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: "Invalid token" });
  });
});
