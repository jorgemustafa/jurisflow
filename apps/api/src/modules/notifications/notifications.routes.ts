import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { notificationsRepository } from "./notifications.repository.js";
import { listNotificationsQuerySchema, notificationParamsSchema } from "./notifications.schemas.js";
import { createNotificationsService, NotificationNotFoundError } from "./notifications.service.js";

const notificationsService = createNotificationsService(notificationsRepository);

function handleNotificationError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid notification request", issues: error.issues });
  if (error instanceof NotificationNotFoundError) return reply.code(404).send({ message: error.message });
  throw error;
}

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/", async (request, reply) => {
    try {
      const filters = listNotificationsQuerySchema.parse(request.query);
      return await notificationsService.list(request.user!.id, filters);
    } catch (error) {
      return handleNotificationError(error, reply);
    }
  });

  app.get("/unread-count", async (request, reply) => {
    try {
      return await notificationsService.unreadCount(request.user!.id);
    } catch (error) {
      return handleNotificationError(error, reply);
    }
  });

  app.patch("/:id/read", async (request, reply) => {
    try {
      const { id } = notificationParamsSchema.parse(request.params);
      return await notificationsService.markRead(id, request.user!.id);
    } catch (error) {
      return handleNotificationError(error, reply);
    }
  });

  app.post("/read-all", async (request, reply) => {
    try {
      return await notificationsService.markAllRead(request.user!.id);
    } catch (error) {
      return handleNotificationError(error, reply);
    }
  });
}
