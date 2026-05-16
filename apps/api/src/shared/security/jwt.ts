import { createHmac, timingSafeEqual } from "node:crypto";

type JwtPayload = {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

const encoder = new TextEncoder();

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signData(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function signJwt(payload: JwtPayload, secret: string, expiresInSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const data = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  return `${data}.${signData(data, secret)}`;
}

export function verifyJwt<T extends JwtPayload>(token: string, secret: string): T {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) throw new Error("Invalid token");

  const data = `${header}.${payload}`;
  const expected = encoder.encode(signData(data, secret));
  const actual = encoder.encode(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Invalid token");

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) throw new Error("Expired token");
  return parsed;
}
