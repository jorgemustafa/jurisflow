export type FinanceSchedule = {
  balanceCents: number;
  dueDay: number | null;
  installmentCount: number;
  lastDueDate: string;
};

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const addMonths = (date: Date, months: number) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
};

export const calculateFinanceSchedule = (
  totalFeeAmountCents: number,
  entryAmountCents: number,
  installmentAmountCents: number,
  firstDueDate: string,
): FinanceSchedule => {
  const balanceCents =
    Number.isFinite(totalFeeAmountCents) && Number.isFinite(entryAmountCents)
      ? totalFeeAmountCents - entryAmountCents
      : NaN;
  const firstDue = parseDateOnly(firstDueDate);
  const installmentCount =
    Number.isFinite(balanceCents) &&
    balanceCents > 0 &&
    Number.isFinite(installmentAmountCents) &&
    installmentAmountCents > 0
      ? Math.ceil(balanceCents / installmentAmountCents)
      : 0;

  return {
    balanceCents,
    dueDay: firstDue?.getUTCDate() ?? null,
    installmentCount,
    lastDueDate:
      firstDue && installmentCount > 0
        ? dateInputValue(addMonths(firstDue, installmentCount - 1))
        : "",
  };
};

export const installmentAmountForCount = (
  balanceCents: number,
  installmentCount: number,
) =>
  Number.isFinite(balanceCents) && balanceCents > 0 && installmentCount > 0
    ? Math.ceil(balanceCents / installmentCount)
    : NaN;

export const dateWithDueDay = (dateValue: string, dueDay: number) => {
  const date = parseDateOnly(dateValue);
  if (!date || dueDay < 1 || dueDay > 31) return dateValue;
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return dateInputValue(
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        Math.min(dueDay, lastDay),
      ),
    ),
  );
};
