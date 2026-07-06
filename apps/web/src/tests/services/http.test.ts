import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  backendErrorMessage,
  configureAuthHandlers,
  issueMessage,
  request,
  responseErrorMessage,
  shouldRetryRequest,
} from "src/services/http.js";

afterEach(() => {
  configureAuthHandlers(null);
  vi.restoreAllMocks();
});

describe("frontend API errors", () => {
  it("translates validation issues instead of exposing Zod messages", () => {
    expect(
      issueMessage({
        code: "invalid_enum_value",
        message:
          "Invalid enum value. Expected 'initial' | 'appeal', received ''",
      }),
    ).toBe("Selecione uma opção válida.");
  });

  it("translates known business errors", () => {
    expect(
      responseErrorMessage(409, { message: "Case CNJ already exists" }),
    ).toBe("Já existe um processo com este número CNJ.");
  });

  it("hides unknown backend details", () => {
    expect(
      responseErrorMessage(500, {
        message: "Invalid db.caseImportBatch.create() invocation",
      }),
    ).toBe("Ocorreu um erro interno. Tente novamente.");
  });

  it("hides unknown errors stored in API results", () => {
    expect(backendErrorMessage("connection refused", "Falha na sincronização")).toBe(
      "Falha na sincronização",
    );
  });
});

describe("authenticated API requests", () => {
  const token = (expiresAt: number) =>
    `header.${btoa(JSON.stringify({ exp: expiresAt })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}.signature`;

  it("refreshes an expiring token once before concurrent requests", async () => {
    let accessToken = token(Math.floor(Date.now() / 1000) - 60);
    const freshToken = token(Math.floor(Date.now() / 1000) + 900);
    const refresh = vi.fn(async () => {
      accessToken = freshToken;
      return freshToken;
    });
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: `Bearer ${freshToken}` });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    configureAuthHandlers({ getAccessToken: () => accessToken, refresh, logout: vi.fn() });

    await Promise.all([request("/clients"), request("/cases")]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares refresh after concurrent unauthorized responses", async () => {
    let accessToken = "old-token";
    const refresh = vi.fn(async () => {
      accessToken = "new-token";
      return accessToken;
    });
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      new Response(JSON.stringify({ ok: accessToken === "new-token" }), {
        status: init?.headers && (init.headers as Record<string, string>).Authorization === "Bearer new-token" ? 200 : 401
      }));
    vi.stubGlobal("fetch", fetchMock);
    configureAuthHandlers({ getAccessToken: () => accessToken, refresh, logout: vi.fn() });

    await Promise.all([request("/clients"), request("/cases")]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("never retries unauthorized query errors", () => {
    expect(shouldRetryRequest(0, new ApiError("Unauthorized", {}, 401))).toBe(false);
    expect(shouldRetryRequest(2, new ApiError("Server error", {}, 500))).toBe(true);
    expect(shouldRetryRequest(3, new ApiError("Server error", {}, 500))).toBe(false);
  });
});
