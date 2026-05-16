export class ApiError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

type AppRequestInit = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

let authHandlers: {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
  logout: () => void;
} | null = null;

export function configureAuthHandlers(handlers: typeof authHandlers) {
  authHandlers = handlers;
}

async function fetchApi(path: string, init?: AppRequestInit) {
  const token = init?.skipAuth ? null : authHandlers?.getAccessToken();
  const { skipAuth: _skipAuth, skipRefresh: _skipRefresh, ...fetchInit } = init ?? {};

  return fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchInit.headers
    },
    ...fetchInit
  });
}

export const request = async <T>(path: string, init?: AppRequestInit): Promise<T> => {
  let response = await fetchApi(path, init);

  if (response.status === 401 && !init?.skipAuth && !init?.skipRefresh && authHandlers) {
    const token = await authHandlers.refresh();
    if (token) response = await fetchApi(path, { ...init, skipRefresh: true });
    else authHandlers.logout();
  }

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const fieldErrors: Record<string, string> = {};

    if (Array.isArray(body?.issues)) {
      for (const issue of body.issues) {
        const field = issue.path?.[0];
        if (field) fieldErrors[field] = issue.message;
      }
    }

    if (body?.field) fieldErrors[body.field] = body.message;
    throw new ApiError(body?.message ?? "Erro inesperado", fieldErrors);
  }

  return response.json() as Promise<T>;
};

export const searchParams = (filters: Record<string, string>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};
