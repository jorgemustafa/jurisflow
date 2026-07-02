import { z } from "zod";
import {
  clientStatusSchema,
  clientTypeSchema,
  isValidCnpj,
  isValidCpf,
  isValidDocumentForType,
  type ClientStatus,
  type ClientType
} from "@magistrum/shared";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional()) as z.ZodEffects<z.ZodOptional<T>, z.output<T> | undefined>;

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, schema.nullable().optional()) as z.ZodEffects<z.ZodOptional<z.ZodNullable<T>>, z.output<T> | null | undefined>;

const optionalText = (max: number) => emptyToUndefined(z.string().trim().max(max));
const nullableText = (max: number) => emptyToNull(z.string().trim().max(max));

const optionalEmail = emptyToUndefined(z.string().trim().email().transform((value) => value.toLowerCase()));
const nullableEmail = emptyToNull(z.string().trim().email().transform((value) => value.toLowerCase()));

const optionalPhone = emptyToUndefined(
  z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 10 || value.length === 11, "Phone must have 10 or 11 digits")
);
const nullablePhone = emptyToNull(
  z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 10 || value.length === 11, "Phone must have 10 or 11 digits")
);

const optionalDocument = emptyToUndefined(z.string().transform(onlyDigits));
const nullableDocument = emptyToNull(z.string().transform(onlyDigits));

function validateDocument(type: ClientType, document: string | null | undefined, context: z.RefinementCtx) {
  if (!document) return;

  if (!isValidDocumentForType(type, document)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: type === "individual" ? "Invalid CPF" : "Invalid CNPJ",
      path: ["document"]
    });
  }
}

export const createClientSchema = z
  .object({
    type: clientTypeSchema,
    name: z.string().trim().min(2).max(255),
    document: optionalDocument,
    email: optionalEmail,
    phone: optionalPhone,
    address: optionalText(500),
    notes: optionalText(1000)
  })
  .superRefine((data, context) => validateDocument(data.type, data.document, context));

export const updateClientSchema = z
  .object({
    type: clientTypeSchema.optional(),
    name: z.string().trim().min(2).max(255).optional(),
    document: nullableDocument,
    email: nullableEmail,
    phone: nullablePhone,
    address: nullableText(500),
    notes: nullableText(1000)
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided")
  .superRefine((data, context) => {
    if (data.type && data.document) validateDocument(data.type, data.document, context);
  });

export const listClientsQuerySchema = z.object({
  q: optionalText(100),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  type: z.union([clientTypeSchema, z.literal("all")]).optional()
});

export const updateClientStatusSchema = z.object({
  status: clientStatusSchema
});

export const clientParamsSchema = z.object({
  id: z.string().uuid()
});

export type ClientListFilters = z.infer<typeof listClientsQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type { ClientStatus, ClientType };
export { isValidCnpj, isValidCpf, isValidDocumentForType };
