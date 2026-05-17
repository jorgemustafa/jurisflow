import { request } from "src/services/http.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "lawyer" | "assistant";
  status: "active" | "inactive";
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
};

export type LoginInput = {
  email: string;
  password: string;
};

export const login = (data: LoginInput) => {
  return request<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(data), skipAuth: true });
};

export const refreshSession = (refreshToken: string) => {
  return request<AuthSession>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }), skipAuth: true });
};

export const getCurrentUser = () => {
  return request<AuthUser>("/auth/me");
};
