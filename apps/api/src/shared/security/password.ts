import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);
const iterations = 120_000;
const keyLength = 32;
const digest = "sha256";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = await pbkdf2Async(password, salt, iterations, keyLength, digest);
  return `pbkdf2_${digest}$${iterations}$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationText, salt, hash] = storedHash.split("$");
  if (algorithm !== `pbkdf2_${digest}` || !iterationText || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const actual = await pbkdf2Async(password, salt, Number(iterationText), expected.length, digest);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
