import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { requireAuth } from "../../shared/http/protected.js";
import { parseBody } from "../../shared/http/validate.js";
import { paymentsRepository } from "./payments.repository.js";
import {
  cancelPaymentSchema,
  createPaymentSchema,
  listPaymentsQuerySchema,
  markPaymentPaidSchema,
  paymentParamsSchema,
  updatePaymentSchema
} from "./payments.schemas.js";
import {
  PaymentCaseError,
  PaymentClientError,
  PaymentNotFoundError,
  PaymentStatusError,
  createPaymentsService
} from "./payments.service.js";

const paymentsService = createPaymentsService(paymentsRepository);

function handlePaymentError(error: unknown, reply: FastifyReply) {
  if (error instanceof ZodError) return reply.code(400).send({ message: "Invalid payment data", issues: error.issues });
  if (error instanceof PaymentNotFoundError) return reply.code(404).send({ message: error.message });
  if (error instanceof PaymentClientError) return reply.code(400).send({ message: error.message, field: "clientId" });
  if (error instanceof PaymentCaseError) return reply.code(400).send({ message: error.message, field: "caseId" });
  if (error instanceof PaymentStatusError) return reply.code(400).send({ message: error.message });
  throw error;
}

export async function paymentsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth());

  app.get("/payments", async (request, reply) => {
    try {
      return await paymentsService.list(listPaymentsQuerySchema.parse(request.query));
    } catch (error) {
      return handlePaymentError(error, reply);
    }
  });

  app.post("/payments", async (request, reply) => {
    try {
      const payment = await paymentsService.create(parseBody(createPaymentSchema, request.body));
      return reply.code(201).send(payment);
    } catch (error) {
      return handlePaymentError(error, reply);
    }
  });

  app.patch("/payments/:id", async (request, reply) => {
    try {
      const { id } = paymentParamsSchema.parse(request.params);
      return await paymentsService.update(id, parseBody(updatePaymentSchema, request.body));
    } catch (error) {
      return handlePaymentError(error, reply);
    }
  });

  app.patch("/payments/:id/paid", async (request, reply) => {
    try {
      const { id } = paymentParamsSchema.parse(request.params);
      return await paymentsService.markPaid(id, parseBody(markPaymentPaidSchema, request.body));
    } catch (error) {
      return handlePaymentError(error, reply);
    }
  });

  app.patch("/payments/:id/cancel", async (request, reply) => {
    try {
      const { id } = paymentParamsSchema.parse(request.params);
      return await paymentsService.cancel(id, parseBody(cancelPaymentSchema, request.body));
    } catch (error) {
      return handlePaymentError(error, reply);
    }
  });

}
