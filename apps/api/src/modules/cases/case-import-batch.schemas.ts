import { z } from "zod";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const cnjNumber = z
  .string()
  .transform(onlyDigits)
  .refine((value) => value.length === 20, "CNJ must have 20 digits");

export const createCaseImportBatchSchema = z.object({
  cnjNumbers: z.array(cnjNumber).min(1).max(50)
});

export const caseImportBatchParamsSchema = z.object({
  batchId: z.string().uuid()
});

export const caseImportItemParamsSchema = z.object({
  batchId: z.string().uuid(),
  itemId: z.string().uuid()
});

export const updateCaseImportItemSchema = z
  .object({
    clientId: z.string().uuid().nullable().optional(),
    status: z.enum(["pending", "discarded"]).optional()
  })
  .refine((data) => data.clientId !== undefined || data.status !== undefined, "At least one field must be provided");

export type CreateCaseImportBatchInput = z.infer<typeof createCaseImportBatchSchema>;
export type UpdateCaseImportItemInput = z.infer<typeof updateCaseImportItemSchema>;
