import { describe, expect, it } from "vitest";
import { parseEnv, validateProductionEnv } from "./validate-production-env.mjs";

const validEnv = {
  POSTGRES_DB: "magistrum",
  POSTGRES_ADMIN_USER: "magistrum_admin",
  POSTGRES_ADMIN_PASSWORD: "a".repeat(32),
  POSTGRES_APP_USER: "magistrum_app",
  POSTGRES_APP_PASSWORD: "b".repeat(32),
  JWT_SECRET: "c".repeat(64),
  DATAJUD_API_KEY: "configured",
  APP_ORIGIN: "https://magistrum.com.br",
  OCI_REGION: "sa-saopaulo-1",
  OCI_OBJECT_NAMESPACE: "namespace",
  OCI_OBJECT_BUCKET: "magistrum-documents",
  DOCUMENT_MAX_SIZE_BYTES: "26214400",
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
      APP_ORIGIN: "http://magistrum.example.com/path",
      DOCUMENT_MAX_SIZE_BYTES: "invalid",
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        "POSTGRES_ADMIN_PASSWORD must be configured",
        "POSTGRES_APP_PASSWORD must have at least 32 URL-safe characters",
        "POSTGRES_ADMIN_USER and POSTGRES_APP_USER must be different",
        "JWT_SECRET must have at least 64 characters",
        "APP_ORIGIN must be a real HTTPS origin without a path",
        "DOCUMENT_MAX_SIZE_BYTES must be a positive integer",
      ]),
    );
  });

  it("parses quoted values and ignores comments", () => {
    expect(parseEnv('# comment\nPOSTGRES_DB="magistrum"\nWEB_PORT=8080\n')).toEqual({
      POSTGRES_DB: "magistrum",
      WEB_PORT: "8080",
    });
  });
});
