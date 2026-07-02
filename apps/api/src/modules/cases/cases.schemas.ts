import { caseFinanceSchema } from "@magistrum/shared";
import { z } from "zod";

export const caseTypeSchema = z.enum(["judicial", "extrajudicial"]);
export const caseStatusSchema = z.enum(["active", "on_hold", "closed", "canceled"]);
export const caseStageSchema = z.enum(["initial", "hearing_scheduled", "waiting_decision", "appeal", "enforcement"]);
export const legalAreaSchema = z.enum([
  "civil",
  "labor",
  "family",
  "criminal",
  "tax",
  "consumer",
  "business",
  "social_security",
  "other"
]);

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
const optionalUuid = emptyToUndefined(z.string().uuid());
const nullableUuid = emptyToNull(z.string().uuid());
const optionalDate = emptyToUndefined(z.coerce.date());
const nullableDate = emptyToNull(z.coerce.date());
const optionalCnj = emptyToUndefined(z.string().transform(onlyDigits).refine((value) => value.length === 20, "CNJ must have 20 digits"));
const nullableCnj = emptyToNull(z.string().transform(onlyDigits).refine((value) => value.length === 20, "CNJ must have 20 digits"));

function validateCnjForType(caseType: CaseType | undefined, cnjNumber: string | null | undefined, context: z.RefinementCtx) {
  if (caseType === "extrajudicial" && cnjNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CNJ is only allowed for judicial cases",
      path: ["cnjNumber"]
    });
  }
}

export const createCaseSchema = z
  .object({
    clientId: z.string().uuid(),
    responsibleUserId: optionalUuid,
    caseType: caseTypeSchema.optional(),
    title: z.string().trim().min(2).max(255),
    cnjNumber: optionalCnj,
    status: caseStatusSchema.optional(),
    stage: caseStageSchema.optional(),
    legalArea: legalAreaSchema.optional(),
    opposingParty: optionalText(255),
    court: optionalText(120),
    jurisdiction: optionalText(120),
    division: optionalText(120),
    description: optionalText(2000),
    openedAt: optionalDate,
    closedAt: optionalDate,
    finance: caseFinanceSchema
  })
  .superRefine((data, context) => validateCnjForType(data.caseType, data.cnjNumber, context));

export const updateCaseSchema = z
  .object({
    clientId: z.string().uuid().optional(),
    responsibleUserId: nullableUuid,
    caseType: caseTypeSchema.optional(),
    title: z.string().trim().min(2).max(255).optional(),
    cnjNumber: nullableCnj,
    status: caseStatusSchema.optional(),
    stage: caseStageSchema.nullable().optional(),
    legalArea: legalAreaSchema.nullable().optional(),
    opposingParty: nullableText(255),
    court: nullableText(120),
    jurisdiction: nullableText(120),
    division: nullableText(120),
    description: nullableText(2000),
    openedAt: nullableDate,
    closedAt: nullableDate
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided")
  .superRefine((data, context) => validateCnjForType(data.caseType, data.cnjNumber, context));

export const listCasesQuerySchema = z.object({
  q: optionalText(100),
  status: z.union([caseStatusSchema, z.literal("all")]).default("active"),
  caseType: z.union([caseTypeSchema, z.literal("all")]).optional(),
  stage: z.union([caseStageSchema, z.literal("all")]).optional(),
  legalArea: z.union([legalAreaSchema, z.literal("all")]).optional(),
  clientId: optionalUuid,
  responsibleUserId: optionalUuid
});

export const caseParamsSchema = z.object({
  id: z.string().uuid()
});

export type CaseType = z.infer<typeof caseTypeSchema>;
export type CaseStatus = z.infer<typeof caseStatusSchema>;
export type CaseStage = z.infer<typeof caseStageSchema>;
export type LegalArea = z.infer<typeof legalAreaSchema>;
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CaseListFilters = z.infer<typeof listCasesQuerySchema>;
