import { z } from "zod";

export const clientTypeSchema = z.enum(["individual", "company"]);
export const clientStatusSchema = z.enum(["active", "inactive"]);

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const isRepeated = (value: string) => /^(\d)\1+$/.test(value);

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

export function isValidCpf(value: string) {
  if (!/^\d{11}$/.test(value) || isRepeated(value)) return false;

  const digits = [...value].map(Number);
  const first = digits.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstCheck = (first * 10) % 11;
  const second = digits.slice(0, 10).reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondCheck = (second * 10) % 11;

  return (firstCheck === 10 ? 0 : firstCheck) === digits[9] && (secondCheck === 10 ? 0 : secondCheck) === digits[10];
}

export function isValidCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || isRepeated(value)) return false;

  const digits = [...value].map(Number);
  const calc = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === digits[12] && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === digits[13];
}

export function isValidDocumentForType(type: ClientType, document: string) {
  return type === "individual" ? isValidCpf(document) : isValidCnpj(document);
}

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

export type ClientType = z.infer<typeof clientTypeSchema>;
export type ClientStatus = z.infer<typeof clientStatusSchema>;
export type ClientListFilters = z.infer<typeof listClientsQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
