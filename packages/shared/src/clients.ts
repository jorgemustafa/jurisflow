import { z } from "zod";

export const clientTypeSchema = z.enum(["individual", "company"]);
export const clientStatusSchema = z.enum(["active", "inactive"]);

export type ClientType = z.infer<typeof clientTypeSchema>;
export type ClientStatus = z.infer<typeof clientStatusSchema>;

export type ClientSummary = {
  id: string;
  type: ClientType;
  status: ClientStatus;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  updatedAt: string;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const isRepeated = (value: string) => /^(\d)\1+$/.test(value);

export function isValidCpf(value: string) {
  if (!/^\d{11}$/.test(value) || isRepeated(value)) return false;

  const digits = [...value].map(Number);
  const first = digits.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstCheck = (first * 10) % 11;
  const second = digits.slice(0, 10).reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondCheck = (second * 10) % 11;

  return (firstCheck === 10 ? 0 : firstCheck) === digits[9] && (secondCheck === 10 ? 0 : secondCheck) === digits[10];
}

export function isValidCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || isRepeated(value)) return false;

  const digits = [...value].map(Number);
  const calc = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === digits[12] && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === digits[13];
}

export function isValidDocumentForType(type: ClientType, document: string) {
  const digits = onlyDigits(document);
  return type === "individual" ? isValidCpf(digits) : isValidCnpj(digits);
}

export const clientFormSchema = z
  .object({
    type: clientTypeSchema,
    name: z.string().trim().min(2, { message: "Informe ao menos 2 caracteres" }).max(255, { message: "Use até 255 caracteres" }),
    document: z.string().trim(),
    rg: z.string().trim().max(20, "Use até 20 caracteres"),
    email: z.union([z.literal(""), z.string().trim().email("Informe um email válido")]),
    phone: z
      .string()
      .trim()
      .refine((value) => {
        const digits = onlyDigits(value);
        return digits.length === 0 || digits.length === 10 || digits.length === 11;
      }, "Telefone deve ter 10 ou 11 dígitos"),
    address: z.string().trim().max(500, "Use até 500 caracteres"),
    street: z.string().trim().max(255, "Use até 255 caracteres"),
    city: z.string().trim().max(120, "Use até 120 caracteres"),
    state: z.string().trim().max(2, "Use UF com 2 letras"),
    zipCode: z
      .string()
      .trim()
      .refine((value) => {
        const digits = onlyDigits(value);
        return digits.length === 0 || digits.length === 8;
      }, "CEP deve ter 8 dígitos"),
    notes: z.string().trim().max(1000, "Use até 1000 caracteres")
  })
  .superRefine((data, context) => {
    if (!data.document.trim()) return;
    if (isValidDocumentForType(data.type, data.document)) return;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: data.type === "individual" ? "CPF inválido" : "CNPJ inválido",
      path: ["document"]
    });
  });

export type ClientFormData = z.infer<typeof clientFormSchema>;
