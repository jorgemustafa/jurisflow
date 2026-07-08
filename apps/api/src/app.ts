import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { caseTimelineRoutes } from "./modules/cases/case-timeline.routes.js";
import { casesRoutes } from "./modules/cases/cases.routes.js";
import { clientsRoutes } from "./modules/clients/clients.routes.js";
import { deadlinesRoutes } from "./modules/deadlines/deadlines.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { documentMaxSizeBytes } from "./modules/documents/documents.service.js";
import { financeRoutes } from "./modules/finance/finance.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { paymentsRoutes } from "./modules/payments/payments.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  const maxDocumentSize = documentMaxSizeBytes();

  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173"
  });
  app.register(multipart, { limits: { files: 1, fields: 3, parts: 4, fileSize: maxDocumentSize } });

  app.get("/health", async () => ({ status: "ok" }));
  app.register(authRoutes, { prefix: "/auth" });
  app.register(clientsRoutes, { prefix: "/clients" });
  app.register(usersRoutes, { prefix: "/users" });
  app.register(casesRoutes, { prefix: "/cases" });
  app.register(caseTimelineRoutes, { prefix: "/timeline" });
  app.register(notificationsRoutes, { prefix: "/notifications" });
  app.register(documentsRoutes, { prefix: "/documents" });
  app.register(deadlinesRoutes);
  app.register(paymentsRoutes);
  app.register(financeRoutes);

  return app;
}
