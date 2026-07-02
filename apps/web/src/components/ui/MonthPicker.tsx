import { useEffect, useState } from "react";
import { MONTHS_PT_BR } from "src/utils/month.js";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export const MonthPicker = ({ value, onChange }: MonthPickerProps) => {
  const [year, month] = value.split("-");
  const [yearInput, setYearInput] = useState(year);

  useEffect(() => setYearInput(year), [year]);

  return (
    <div className="month-picker">
      <select aria-label="Mês" value={month} onChange={(event) => onChange(`${year}-${event.target.value}`)}>
        {MONTHS_PT_BR.map((label, index) => (
          <option key={label} value={String(index + 1).padStart(2, "0")}>{label}</option>
        ))}
      </select>
      <input
        aria-label="Ano"
        inputMode="numeric"
        maxLength={4}
        value={yearInput}
        onBlur={() => setYearInput(year)}
        onChange={(event) => {
          const nextYear = event.target.value.replace(/\D/g, "").slice(0, 4);
          setYearInput(nextYear);
          if (nextYear.length === 4) onChange(`${nextYear}-${month}`);
        }}
      />
    </div>
  );
};
