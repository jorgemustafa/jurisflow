import { signJwt, verifyJwt } from "../../shared/security/jwt.js";
import { verifyPassword } from "../../shared/security/password.js";
import type { UserRecord } from "../users/users.service.js";
import type { LoginInput } from "./auth.schemas.js";

type AuthRepository = {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
};

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRecord["role"];
  type: "access" | "refresh";
};

const accessTokenSeconds = 15 * 60;
const refreshTokenSeconds = 7 * 24 * 60 * 60;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super("Invalid token");
  }
}

export class AuthSecretMissingError extends Error {
  constructor() {
    super("JWT_SECRET is required");
  }
}

function publicUser(user: UserRecord) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function requireSecret(secret: string | undefined) {
  if (!secret) throw new AuthSecretMissingError();
  return secret;
}

function issueTokens(user: UserRecord, secret: string) {
  const base = { sub: user.id, email: user.email, role: user.role };
  return {
    accessToken: signJwt({ ...base, type: "access" }, secret, accessTokenSeconds),
    refreshToken: signJwt({ ...base, type: "refresh" }, secret, refreshTokenSeconds),
    tokenType: "Bearer",
    expiresIn: accessTokenSeconds
  };
}

export function createAuthService(repository: AuthRepository, secret = process.env.JWT_SECRET) {
  return {
    async login(input: LoginInput) {
      const jwtSecret = requireSecret(secret);
      const user = await repository.findByEmail(input.email);
      if (!user || user.status !== "active" || !user.passwordHash) throw new InvalidCredentialsError();
      if (!(await verifyPassword(input.password, user.passwordHash))) throw new InvalidCredentialsError();

      return { user: publicUser(user), ...issueTokens(user, jwtSecret) };
    },

    async refresh(refreshToken: string) {
      const jwtSecret = requireSecret(secret);
      let payload: AuthTokenPayload;
      try {
        payload = verifyJwt<AuthTokenPayload>(refreshToken, jwtSecret);
      } catch {
        throw new InvalidTokenError();
      }
      if (payload.type !== "refresh") throw new InvalidTokenError();

      const user = await repository.findById(payload.sub);
      if (!user || user.status !== "active") throw new InvalidTokenError();

      return { user: publicUser(user), ...issueTokens(user, jwtSecret) };
    },

    async authenticate(authorization: string | undefined) {
      const jwtSecret = requireSecret(secret);
      const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
      if (!token) throw new InvalidTokenError();

      let payload: AuthTokenPayload;
      try {
        payload = verifyJwt<AuthTokenPayload>(token, jwtSecret);
      } catch {
        throw new InvalidTokenError();
      }
      if (payload.type !== "access") throw new InvalidTokenError();

      const user = await repository.findById(payload.sub);
      if (!user || user.status !== "active") throw new InvalidTokenError();
      return publicUser(user);
    }
  };
}
