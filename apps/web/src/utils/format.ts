export const formatDate = (value: string) => {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};

export const formatMoney = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
};

export const fieldValue = (value: string | null) => {
  return value?.trim() ? value : "Não informado";
};
