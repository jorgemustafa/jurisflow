import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { parseBody } from "../../shared/http/validate.js";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userParamsSchema } from "./users.schemas.js";
import { usersRepository } from "./users.repository.js";
import { UserEmailConflictError, UserNotFoundError, createUsersService } from "./users.service.js";

const usersService = createUsersService(usersRepository);

function publicUser<T extends { passwordHash: string | null }>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function handleUserError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid user data", issues: error.issues });
  if (error instanceof UserNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof UserEmailConflictError) return reply.code(409).send({ message: error.message, field: "email" });
  throw error;
}

export async function usersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth(["admin"]));

  app.get("/", async (request, reply) => {
    try {
      const users = await usersService.list(listUsersQuerySchema.parse(request.query));
      return users.map(publicUser);
    } catch (error) {
      return handleUserError(error, reply);
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = userParamsSchema.parse(request.params);
      return publicUser(await usersService.get(id));
    } catch (error) {
      return handleUserError(error, reply);
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const user = await usersService.create(parseBody(createUserSchema, request.body));
      return reply.code(201).send(publicUser(user));
    } catch (error) {
      return handleUserError(error, reply);
    }
  });

  app.patch("/:id", async (request, reply) => {
    try {
      const { id } = userParamsSchema.parse(request.params);
      return publicUser(await usersService.update(id, parseBody(updateUserSchema, request.body)));
    } catch (error) {
      return handleUserError(error, reply);
    }
  });
}
