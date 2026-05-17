import type { AuthSession } from "src/services/auth.js";

const storageKey = "jurisflow.auth";

export type StoredAuth = Pick<AuthSession, "accessToken" | "refreshToken" | "user">;

export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function setStoredAuth(session: StoredAuth) {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredAuth() {
  localStorage.removeItem(storageKey);
}
