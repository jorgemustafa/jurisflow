import { z } from "zod";

export const caseTimelineEventTypeSchema = z.enum(["note", "hearing", "petition", "decision", "status_change", "other"]);

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional()) as z.ZodEffects<z.ZodOptional<T>, z.output<T> | undefined>;

const optionalText = (max: number) => emptyToUndefined(z.string().trim().max(max));
const optionalDate = emptyToUndefined(z.coerce.date());

export const createCaseTimelineEventSchema = z.object({
  type: caseTimelineEventTypeSchema,
  title: z.string().trim().min(2).max(255),
  description: optionalText(2000),
  occurredAt: optionalDate
});

export type CaseTimelineEventType = z.infer<typeof caseTimelineEventTypeSchema>;
export type CreateCaseTimelineEventInput = z.infer<typeof createCaseTimelineEventSchema>;
