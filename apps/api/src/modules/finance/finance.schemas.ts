import { z } from "zod";

export const financeDashboardQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
});

export type FinanceDashboardFilters = z.infer<typeof financeDashboardQuerySchema>;
