import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional()) as z.ZodEffects<z.ZodOptional<T>, z.output<T> | undefined>;

const optionalText = (max: number) => emptyToUndefined(z.string().trim().max(max));
const optionalUuid = emptyToUndefined(z.string().uuid());
const mimeType = z.string().trim().max(120).regex(/^[\w.+-]+\/[\w.+-]+$/, "Invalid MIME type");

export const createDocumentSchema = z.object({
  clientId: z.string().uuid(),
  caseId: optionalUuid,
  name: z.string().trim().min(2).max(255),
  path: z.string().trim().min(2).max(1000),
  mimeType
});

export const listDocumentsQuerySchema = z.object({
  q: optionalText(100),
  scope: z.enum(["all", "client", "case"]).default("all"),
  clientId: optionalUuid,
  caseId: optionalUuid
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type DocumentListFilters = z.infer<typeof listDocumentsQuerySchema>;
