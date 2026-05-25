import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthSecretMissingError, InvalidTokenError } from "../../modules/auth/auth.service.js";

export type UserRole = "admin" | "lawyer" | "assistant";
export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

const allRoles = ["admin", "lawyer", "assistant"] as const;

type Authenticate = (authorization: string | undefined) => Promise<AuthenticatedUser>;

export const createRequireAuth =
  (authenticate: Authenticate) =>
  (roles: readonly UserRole[] = allRoles) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await authenticate(request.headers.authorization);
      if (!roles.includes(user.role)) return reply.code(403).send({ message: "Forbidden" });
      request.user = user;
    } catch (error) {
      if (error instanceof InvalidTokenError) return reply.code(401).send({ message: error.message });
      if (error instanceof AuthSecretMissingError) return reply.code(500).send({ message: error.message });
      throw error;
    }
  };
