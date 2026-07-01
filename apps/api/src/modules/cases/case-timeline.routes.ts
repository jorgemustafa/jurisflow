import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { caseTimelineRepository } from "./case-timeline.repository.js";
import { listCaseTimelineQuerySchema } from "./case-timeline.schemas.js";
import { createCaseTimelineService } from "./case-timeline.service.js";

const timelineService = createCaseTimelineService(caseTimelineRepository);

function handleTimelineError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid timeline filters", issues: error.issues });
  throw error;
}

export async function caseTimelineRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/", async (request, reply) => {
    try {
      return await timelineService.listAll(listCaseTimelineQuerySchema.parse(request.query));
    } catch (error) {
      return handleTimelineError(error, reply);
    }
  });
}
