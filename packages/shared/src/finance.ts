import { z } from "zod";

export const paymentMethodSchema = z.enum([
  "pix",
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
  "boleto",
  "other",
]);

const positiveCents = z.number().int().positive();
const isValidDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidDateOnly, "Invalid date");

export const caseFinanceSchema = z
  .object({
    totalFeeAmountCents: positiveCents,
    entryAmountCents: positiveCents,
    entryReceivedAt: dateOnly.optional(),
    installmentAmountCents: positiveCents,
    firstDueDate: dateOnly,
    entryPaymentMethod: paymentMethodSchema,
    pastInstallmentsPaid: z.boolean().optional(),
  })
  .refine((data) => data.entryAmountCents < data.totalFeeAmountCents, {
    message: "Entry amount must be lower than total fee",
    path: ["entryAmountCents"],
  });

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type CaseFinanceInput = z.infer<typeof caseFinanceSchema>;
