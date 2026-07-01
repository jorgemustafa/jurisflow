import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { parseBody } from "../../shared/http/validate.js";
import { usersRepository } from "../users/users.repository.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";
import {
  AuthSecretMissingError,
  InvalidCredentialsError,
  InvalidTokenError,
  createAuthService,
} from "./auth.service.js";

function handleAuthError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError)
    return reply
      .code(400)
      .send({ message: "Invalid auth data", issues: error.issues });
  if (error instanceof InvalidCredentialsError)
    return reply.code(401).send({ message: error.message });
  if (error instanceof InvalidTokenError)
    return reply.code(401).send({ message: error.message });
  if (error instanceof AuthSecretMissingError)
    return reply.code(500).send({ message: error.message });
  throw error;
}

export function createAuthRoutes(
  authService: ReturnType<typeof createAuthService>,
) {
  return async function authRoutes(app: FastifyInstance) {
    app.post("/login", async (request, reply) => {
      try {
        return await authService.login(parseBody(loginSchema, request.body));
      } catch (error) {
        return handleAuthError(error, reply);
      }
    });

    app.post("/refresh", async (request, reply) => {
      try {
        const { refreshToken } = parseBody(refreshTokenSchema, request.body);
        return await authService.refresh(refreshToken);
      } catch (error) {
        return handleAuthError(error, reply);
      }
    });

    app.post("/forgot-password", async (request, reply) => {
      try {
        return await authService.requestPasswordReset(
          parseBody(forgotPasswordSchema, request.body),
        );
      } catch (error) {
        return handleAuthError(error, reply);
      }
    });

    app.post("/reset-password", async (request, reply) => {
      try {
        return await authService.resetPassword(
          parseBody(resetPasswordSchema, request.body),
        );
      } catch (error) {
        return handleAuthError(error, reply);
      }
    });

    app.get("/me", async (request, reply) => {
      try {
        return await authService.authenticate(request.headers.authorization);
      } catch (error) {
        return handleAuthError(error, reply);
      }
    });
  };
}

export const authRoutes = createAuthRoutes(createAuthService(usersRepository));
