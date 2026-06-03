import { z } from "zod";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const cnjNumber = z.string().transform(onlyDigits).refine((value) => value.length === 20, "CNJ must have 20 digits");
const courtCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,12}$/, "Court code is invalid");

export const previewCaseImportSchema = z.object({
  cnjNumber,
  courtCode
});

export const confirmCaseImportSchema = previewCaseImportSchema.extend({
  clientId: z.string().uuid()
});

export type PreviewCaseImportInput = z.infer<typeof previewCaseImportSchema>;
export type ConfirmCaseImportInput = z.infer<typeof confirmCaseImportSchema>;
