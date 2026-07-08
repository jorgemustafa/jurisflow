import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredKeys = [
  "POSTGRES_DB",
  "POSTGRES_ADMIN_USER",
  "POSTGRES_ADMIN_PASSWORD",
  "POSTGRES_APP_USER",
  "POSTGRES_APP_PASSWORD",
  "JWT_SECRET",
  "DATAJUD_API_KEY",
  "APP_ORIGIN",
  "OCI_REGION",
  "OCI_OBJECT_NAMESPACE",
  "OCI_OBJECT_BUCKET",
];

export function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator < 1) throw new Error(`Invalid environment line: ${line}`);
        const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
        return [line.slice(0, separator).trim(), value];
      }),
  );
}

export function validateProductionEnv(env) {
  const errors = requiredKeys
    .filter((key) => !env[key] || env[key].includes("CHANGE_ME"))
    .map((key) => `${key} must be configured`);

  for (const key of ["POSTGRES_ADMIN_PASSWORD", "POSTGRES_APP_PASSWORD"]) {
    if (env[key] && (!/^[A-Za-z0-9_-]{32,}$/.test(env[key]) || env[key].includes("CHANGE_ME"))) {
      errors.push(`${key} must have at least 32 URL-safe characters`);
    }
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 64)
    errors.push("JWT_SECRET must have at least 64 characters");

  if (env.DOCUMENT_MAX_SIZE_BYTES && (!/^\d+$/.test(env.DOCUMENT_MAX_SIZE_BYTES) || Number(env.DOCUMENT_MAX_SIZE_BYTES) < 1))
    errors.push("DOCUMENT_MAX_SIZE_BYTES must be a positive integer");

  for (const key of ["POSTGRES_DB", "POSTGRES_ADMIN_USER", "POSTGRES_APP_USER"]) {
    if (env[key] && !/^[a-z_][a-z0-9_]*$/.test(env[key]))
      errors.push(`${key} must be a lowercase PostgreSQL identifier`);
  }

  if (env.POSTGRES_ADMIN_USER === env.POSTGRES_APP_USER)
    errors.push("POSTGRES_ADMIN_USER and POSTGRES_APP_USER must be different");

  try {
    const origin = new URL(env.APP_ORIGIN);
    if (
      origin.protocol !== "https:" ||
      origin.origin !== env.APP_ORIGIN ||
      origin.hostname === "example.com" ||
      origin.hostname.endsWith(".example.com")
    )
      errors.push("APP_ORIGIN must be a real HTTPS origin without a path");
  } catch {
    errors.push("APP_ORIGIN must be a valid HTTPS origin");
  }

  return [...new Set(errors)];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const file = process.argv[2] ?? ".env.prod";
  const errors = validateProductionEnv(parseEnv(readFileSync(file, "utf8")));
  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }
  console.log(`${file} is valid for production deployment`);
}
