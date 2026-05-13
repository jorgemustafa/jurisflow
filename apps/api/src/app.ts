import cors from "@fastify/cors";
import Fastify from "fastify";
import { clientsRoutes } from "./modules/clients/clients.routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173"
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.register(clientsRoutes, { prefix: "/clients" });

  return app;
}
