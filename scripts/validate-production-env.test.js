import { describe, expect, it } from "vitest";
import { parseEnv, validateProductionEnv } from "./validate-production-env.mjs";

const validEnv = {
  POSTGRES_DB: "jurisflow",
  POSTGRES_ADMIN_USER: "jurisflow_admin",
  POSTGRES_ADMIN_PASSWORD: "a".repeat(32),
  POSTGRES_APP_USER: "jurisflow_app",
  POSTGRES_APP_PASSWORD: "b".repeat(32),
  JWT_SECRET: "c".repeat(64),
  DATAJUD_API_KEY: "configured",
  APP_ORIGIN: "https://jurisflow.com.br",
};

describe("production environment", () => {
  it("accepts separate strong database credentials and an HTTPS origin", () => {
    expect(validateProductionEnv(validEnv)).toEqual([]);
  });

  it("rejects placeholders, weak credentials and an insecure origin", () => {
    const errors = validateProductionEnv({
      ...validEnv,
      POSTGRES_ADMIN_PASSWORD: "CHANGE_ME",
      POSTGRES_APP_USER: validEnv.POSTGRES_ADMIN_USER,
      POSTGRES_APP_PASSWORD: "short",
      JWT_SECRET: "short",
      APP_ORIGIN: "http://jurisflow.example.com/path",
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "POSTGRES_ADMIN_PASSWORD must be configured",
        "POSTGRES_APP_PASSWORD must have at least 32 URL-safe characters",
        "POSTGRES_ADMIN_USER and POSTGRES_APP_USER must be different",
        "JWT_SECRET must have at least 64 characters",
        "APP_ORIGIN must be a real HTTPS origin without a path",
      ]),
    );
  });

  it("parses quoted values and ignores comments", () => {
    expect(parseEnv('# comment\nPOSTGRES_DB="jurisflow"\nWEB_PORT=8080\n')).toEqual({
      POSTGRES_DB: "jurisflow",
      WEB_PORT: "8080",
    });
  });
});
