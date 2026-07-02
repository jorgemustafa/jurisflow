import type { FastifyInstance, FastifyReply } from "fastify";
import { requireAuth } from "../../shared/http/protected.js";
import { ZodError } from "zod";
import { parseBody } from "../../shared/http/validate.js";
import { clientsRepository } from "./clients.repository.js";
import {
  clientParamsSchema,
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
  updateClientStatusSchema
} from "./clients.schemas.js";
import {
  ClientDocumentConflictError,
  ClientDocumentTypeError,
  ClientNotFoundError,
  createClientsService
} from "./clients.service.js";

const clientsService = createClientsService(clientsRepository);

function parseParams(params: unknown) {
  return clientParamsSchema.parse(params);
}

function handleClientError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.code(400).send({ message: "Invalid client data", issues: error.issues });
  }

  if (error instanceof ClientNotFoundError) {
    return reply.code(404).send({ message: error.message });
  }

  if (error instanceof ClientDocumentConflictError) {
    return reply.code(409).send({ message: error.message, field: "document" });
  }

  if (error instanceof ClientDocumentTypeError) {
    return reply.code(400).send({ message: error.message, field: "document" });
  }

  throw error;
}

export async function clientsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/", async (request, reply) => {
    try {
      const filters = listClientsQuerySchema.parse(request.query);
      return await clientsService.list(filters);
    } catch (error) {
      return handleClientError(error, reply);
    }
  });

  app.get("/:id", async (request, reply) => {
    try {
      const { id } = parseParams(request.params);
      return await clientsService.get(id);
    } catch (error) {
      return handleClientError(error, reply);
    }
  });

  app.post("/", async (request, reply) => {
    try {
      const input = parseBody(createClientSchema, request.body);
      const client = await clientsService.create(input);
      return reply.code(201).send(client);
    } catch (error) {
      return handleClientError(error, reply);
    }
  });

  app.patch("/:id", async (request, reply) => {
    try {
      const { id } = parseParams(request.params);
      const input = parseBody(updateClientSchema, request.body);
      return await clientsService.update(id, input);
    } catch (error) {
      return handleClientError(error, reply);
    }
  });

  app.patch("/:id/status", async (request, reply) => {
    try {
      const { id } = parseParams(request.params);
      const { status } = parseBody(updateClientStatusSchema, request.body);
      return await clientsService.updateStatus(id, status);
    } catch (error) {
      return handleClientError(error, reply);
    }
  });
}
