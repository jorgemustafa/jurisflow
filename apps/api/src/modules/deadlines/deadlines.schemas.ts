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
const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }, schema.nullable().optional()) as z.ZodEffects<z.ZodOptional<z.ZodNullable<T>>, z.output<T> | null | undefined>;

export const createDeadlineSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: optionalText(2000),
  dueAt: z.coerce.date()
});

export const updateDeadlineSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    description: emptyToNull(z.string().trim().max(2000)),
    dueAt: z.coerce.date().optional()
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

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
export type UpdateDeadlineInput = z.infer<typeof updateDeadlineSchema>;
export type UpdateDeadlineStatusInput = z.infer<typeof updateDeadlineStatusSchema>;
export type DeadlineListFilters = z.infer<typeof listDeadlinesQuerySchema>;
