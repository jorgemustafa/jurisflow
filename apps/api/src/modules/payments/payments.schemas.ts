import { z } from "zod";

export const paymentStatusSchema = z.enum(["pending", "paid", "canceled"]);
export const paymentSourceSchema = z.enum(["generated", "manual"]);
export const paymentMethodSchema = z.enum(["pix", "cash", "bank_transfer", "credit_card", "debit_card", "boleto", "other"]);

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().trim().max(max).optional()) as z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined>;

const nullableText = (max: number) =>
  z.preprocess((value) => {
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().trim().max(max).nullable().optional()) as z.ZodEffects<
    z.ZodOptional<z.ZodNullable<z.ZodString>>,
    string | null | undefined
  >;

const optionalUuid = optionalText(36).pipe(z.string().uuid().optional());
const positiveCents = z.number().int().positive();

export const createPaymentSchema = z.object({
  clientId: z.string().uuid(),
  caseId: optionalUuid,
  description: z.string().trim().min(2).max(255),
  amountCents: positiveCents,
  dueDate: z.coerce.date(),
  notes: optionalText(1000)
});

export const updatePaymentSchema = z
  .object({
    amountCents: positiveCents.optional(),
    dueDate: z.coerce.date().optional(),
    paidAt: z.coerce.date().optional(),
    description: z.string().trim().min(2).max(255).optional(),
    notes: nullableText(1000),
    cancelReason: nullableText(500)
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const markPaymentPaidSchema = z.object({
  paidAt: z.coerce.date().optional(),
  paymentMethod: paymentMethodSchema
});

export const cancelPaymentSchema = z.object({
  cancelReason: z.string().trim().min(2).max(500),
  notes: nullableText(1000)
});

export const createPaymentScheduleSchema = z.object({
  totalFeeAmountCents: positiveCents,
  installmentCount: z.number().int().min(1),
  firstDueDate: z.coerce.date(),
  description: optionalText(180)
});

export const listPaymentsQuerySchema = z.object({
  q: optionalText(100),
  status: z.union([paymentStatusSchema, z.literal("all")]).default("pending"),
  overdue: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  month: optionalText(7),
  clientId: optionalUuid,
  caseId: optionalUuid
});

export const paymentParamsSchema = z.object({
  id: z.string().uuid()
});

export const casePaymentScheduleParamsSchema = z.object({
  id: z.string().uuid()
});

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentSource = z.infer<typeof paymentSourceSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type MarkPaymentPaidInput = z.infer<typeof markPaymentPaidSchema>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;
export type CreatePaymentScheduleInput = z.infer<typeof createPaymentScheduleSchema>;
export type PaymentListFilters = z.infer<typeof listPaymentsQuerySchema>;
