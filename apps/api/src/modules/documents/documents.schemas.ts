import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional()) as z.ZodEffects<z.ZodOptional<T>, z.output<T> | undefined>;

const optionalText = (max: number) => emptyToUndefined(z.string().trim().max(max));
const optionalUuid = emptyToUndefined(z.string().uuid());
export const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png"
] as const;

export const createDocumentSchema = z.object({
  clientId: z.string().uuid(),
  caseId: optionalUuid,
  name: z.string().trim().min(2).max(255)
});

export const listDocumentsQuerySchema = z.object({
  q: optionalText(100),
  scope: z.enum(["all", "client", "case"]).default("all"),
  clientId: optionalUuid,
  caseId: optionalUuid
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type DocumentListFilters = z.infer<typeof listDocumentsQuerySchema>;
