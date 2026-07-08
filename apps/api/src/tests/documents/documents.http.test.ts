import { describe, expect, it } from "vitest";

describe("documents HTTP", () => {
  it("registers multipart parser globally", async () => {
    process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/magistrum";
    const { buildApp } = await import("../../app.js");
    const app = buildApp();
    await app.ready();
    expect(app.hasContentTypeParser("multipart/form-data")).toBe(true);
    await app.close();
  }, 15_000);
});
