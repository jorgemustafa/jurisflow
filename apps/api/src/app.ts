import cors from "@fastify/cors";
import Fastify from "fastify";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { caseTimelineRoutes } from "./modules/cases/case-timeline.routes.js";
import { casesRoutes } from "./modules/cases/cases.routes.js";
import { clientsRoutes } from "./modules/clients/clients.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { financeRoutes } from "./modules/finance/finance.routes.js";
import { paymentsRoutes } from "./modules/payments/payments.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173"
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.register(authRoutes, { prefix: "/auth" });
  app.register(clientsRoutes, { prefix: "/clients" });
  app.register(usersRoutes, { prefix: "/users" });
  app.register(casesRoutes, { prefix: "/cases" });
  app.register(caseTimelineRoutes, { prefix: "/timeline" });
  app.register(documentsRoutes, { prefix: "/documents" });
  app.register(paymentsRoutes);
  app.register(financeRoutes);

  return app;
}
