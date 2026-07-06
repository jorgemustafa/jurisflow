import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { configureAuthHandlers } from "src/services/http.js";
import { clearStoredAuth, getStoredAuth, setStoredAuth, type StoredAuth } from "src/services/authStorage.js";
import { refreshSession, type AuthSession } from "src/services/auth.js";

type AuthContextValue = {
  session: StoredAuth | null;
  isAuthenticated: boolean;
  saveSession: (session: AuthSession) => void;
  logout: () => void;
  refresh: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredAuth | null>(() => getStoredAuth());
  const [ready, setReady] = useState(false);

  const saveSession = useCallback((nextSession: AuthSession) => {
    const stored = { accessToken: nextSession.accessToken, refreshToken: nextSession.refreshToken, user: nextSession.user };
    setStoredAuth(stored);
    setSession(stored);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setSession(null);
  }, []);

  const refresh = useCallback(async () => {
    const current = getStoredAuth();
    if (!current?.refreshToken) return null;

    try {
      const nextSession = await refreshSession(current.refreshToken);
      const stored = { accessToken: nextSession.accessToken, refreshToken: nextSession.refreshToken, user: nextSession.user };
      setStoredAuth(stored);
      setSession(stored);
      return stored.accessToken;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    configureAuthHandlers({
      getAccessToken: () => getStoredAuth()?.accessToken ?? null,
      refresh,
      logout
    });
    setReady(true);
  }, [logout, refresh]);

  const value = useMemo(
    () => ({ session, isAuthenticated: Boolean(session), saveSession, logout, refresh }),
    [logout, refresh, saveSession, session]
  );

  if (!ready) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
