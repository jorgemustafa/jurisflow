export class ApiError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init
  });

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
