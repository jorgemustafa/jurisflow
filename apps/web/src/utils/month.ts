export const MONTHS_PT_BR = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
] as const;

export const moveMonth = (month: string, delta: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-");
  return `${MONTHS_PT_BR[Number(monthNumber) - 1]} de ${year}`;
};
