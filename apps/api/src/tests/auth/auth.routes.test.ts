import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { UserRecord } from "../../modules/users/users.service.js";

async function buildAuthApp(user: UserRecord | null = null) {
  process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/magistrum";
  const [{ createAuthRoutes }, { createAuthService }] = await Promise.all([
    import("../../modules/auth/auth.routes.js"),
    import("../../modules/auth/auth.service.js"),
  ]);
  const repository = {
    async findById() {
      return user;
    },
    async findByEmail() {
      return user;
    },
    async updatePasswordHash() {
      if (!user) throw new Error("User not found");
      return user;
    },
  };
  const app = Fastify();
  app.register(createAuthRoutes(createAuthService(repository, "test-secret")), {
    prefix: "/auth",
  });
  return app;
}

describe("auth routes", () => {
  it("returns 401 for invalid login credentials", async () => {
    const response = await (await buildAuthApp()).inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "missing@magistrum.test", password: "password123" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "Invalid email or password" });
  });

  it("returns 400 for invalid request data", async () => {
    const response = await (await buildAuthApp()).inject({
      method: "POST",
      url: "/auth/login",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: "Invalid auth data" });
  });

  it("returns 401 for invalid refresh tokens", async () => {
    const response = await (await buildAuthApp()).inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "invalid-token" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "Invalid token" });
  });
});
