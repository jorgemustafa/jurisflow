import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginSchema>;
