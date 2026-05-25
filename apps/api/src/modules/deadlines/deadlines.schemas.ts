import { z } from "zod";

export const deadlineStatusSchema = z.enum(["pending", "done", "canceled"]);

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional()) as z.ZodEffects<z.ZodOptional<T>, z.output<T> | undefined>;

const optionalText = (max: number) => emptyToUndefined(z.string().trim().max(max));
const optionalUuid = emptyToUndefined(z.string().uuid());

export const createDeadlineSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: optionalText(2000),
  dueAt: z.coerce.date()
});

export const updateDeadlineStatusSchema = z.object({
  status: deadlineStatusSchema
});

export const listDeadlinesQuerySchema = z.object({
  q: optionalText(100),
  status: z.union([deadlineStatusSchema, z.literal("all")]).default("pending"),
  caseId: optionalUuid,
  alertWindowDays: z.coerce.number().int().min(0).max(90).default(7)
});

export const deadlineParamsSchema = z.object({
  id: z.string().uuid()
});

export const caseDeadlineParamsSchema = z.object({
  id: z.string().uuid()
});

export type DeadlineStatus = z.infer<typeof deadlineStatusSchema>;
export type CreateDeadlineInput = z.infer<typeof createDeadlineSchema>;
export type UpdateDeadlineStatusInput = z.infer<typeof updateDeadlineStatusSchema>;
export type DeadlineListFilters = z.infer<typeof listDeadlinesQuerySchema>;
