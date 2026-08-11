import { z } from "zod";

export const caseTimelineEventTypeSchema = z.enum([
  "note",
  "hearing",
  "petition",
  "decision",
  "status_change",
  "other",
]);

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional()) as z.ZodEffects<
    z.ZodOptional<T>,
    z.output<T> | undefined
  >;

const optionalText = (max: number) =>
  emptyToUndefined(z.string().trim().max(max));
const optionalDate = emptyToUndefined(z.coerce.date());
const optionalCnj = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.replace(/\D/g, "") || undefined;
}, z.string().max(20).optional());

export const createCaseTimelineEventSchema = z.object({
  type: caseTimelineEventTypeSchema,
  title: z.string().trim().min(2).max(255),
  description: optionalText(2000),
  occurredAt: optionalDate,
});

export const listCaseTimelineQuerySchema = z.object({
  q: optionalText(100),
  type: z.union([caseTimelineEventTypeSchema, z.literal("all")]).default("all"),
  caseId: optionalText(80),
  cnjNumber: optionalCnj,
});

export type CaseTimelineEventType = z.infer<typeof caseTimelineEventTypeSchema>;
export type CreateCaseTimelineEventInput = z.infer<
  typeof createCaseTimelineEventSchema
>;
export type CaseTimelineFilters = z.infer<typeof listCaseTimelineQuerySchema>;
