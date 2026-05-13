import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { parseBody } from "../../shared/http/validate.js";
import { clientsRepository } from "./clients.repository.js";
import { createClientSchema } from "./clients.schemas.js";
import { createClientsService } from "./clients.service.js";

const clientsService = createClientsService(clientsRepository);

export async function clientsRoutes(app: FastifyInstance) {
  app.get("/", async () => clientsService.list());

  app.post("/", async (request, reply) => {
    try {
      const input = parseBody(createClientSchema, request.body);
      const client = await clientsService.create(input);
      return reply.code(201).send(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ message: "Invalid client data", issues: error.issues });
      }

      throw error;
    }
  });
}
