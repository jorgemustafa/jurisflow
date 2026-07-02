import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "lawyer", "assistant"]);
export const userStatusSchema = z.enum(["active", "inactive"]);

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().trim().max(max).optional()) as z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined>;

const oabNumber = z
  .string()
  .trim()
  .regex(/^\d{1,20}$/, "OAB number must contain only digits")
  .nullable();
const oabState = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "OAB state must be a two-letter UF")
  .nullable();

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: userRoleSchema.optional(),
  password: z.string().min(8).max(128).optional(),
  oabNumber: oabNumber.optional(),
  oabState: oabState.optional()
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    password: z.string().min(8).max(128).optional(),
    oabNumber: oabNumber.optional(),
    oabState: oabState.optional()
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const listUsersQuerySchema = z.object({
  q: optionalText(100),
  role: z.union([userRoleSchema, z.literal("all")]).optional(),
  status: z.enum(["active", "inactive", "all"]).default("all")
});

export const userParamsSchema = z.object({
  id: z.string().uuid()
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListFilters = z.infer<typeof listUsersQuerySchema>;
