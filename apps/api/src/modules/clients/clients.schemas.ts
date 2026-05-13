import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().trim().min(2),
  document: z.string().trim().min(11).max(18).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(8).optional()
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
