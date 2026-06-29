export const parseMoney = (value: string) => {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
};

export const moneyInputValue = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

