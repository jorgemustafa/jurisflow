import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes } from "react";
import { cn } from "src/lib/utils.js";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const formatDate = (value: string) => value ? value.split("-").reverse().join("/") : "";
const toDateValue = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, defaultValue, disabled, name, onBlur, onChange, readOnly, value, ...props },
  ref,
) {
  const initialValue = String(value ?? defaultValue ?? "");
  const [selected, setSelected] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = initialValue ? new Date(`${initialValue}T12:00:00Z`) : new Date();
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  });
  const hiddenInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value === undefined) return;
    const next = String(value ?? "");
    setSelected(next);
    if (next) {
      const date = new Date(`${next}T12:00:00Z`);
      setMonth(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
    }
  }, [value]);

  const choose = (next: string) => {
    setSelected(next);
    setOpen(false);
    onChange?.({ target: { name, value: next } } as ChangeEvent<HTMLInputElement>);
  };
  const firstWeekday = month.getUTCDay();
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();

  return (
    <div className="date-input">
      <input ref={ref ?? hiddenInput} name={name} type="hidden" value={selected} readOnly {...props} />
      <button
        className={cn("date-input-trigger", className)}
        type="button"
        disabled={disabled || readOnly}
        onBlur={() => onBlur?.({ target: { name, value: selected } } as FocusEvent<HTMLInputElement>)}
        onClick={() => setOpen((current) => !current)}
      >
        {formatDate(selected) || "dd/mm/aaaa"}
        <CalendarDays size={16} />
      </button>
      {open ? (
        <div className="date-picker" role="dialog" aria-label="Selecionar data">
          <div className="date-picker-header">
            <button type="button" onClick={() => setMonth((date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)))}><ChevronLeft size={16} /></button>
            <strong>{months[month.getUTCMonth()]} {month.getUTCFullYear()}</strong>
            <button type="button" onClick={() => setMonth((date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)))}><ChevronRight size={16} /></button>
          </div>
          <div className="date-picker-grid">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index + 1));
              const dateValue = toDateValue(date);
              return <button className={selected === dateValue ? "selected" : ""} key={dateValue} type="button" onClick={() => choose(dateValue)}>{index + 1}</button>;
            })}
          </div>
          <div className="date-picker-actions">
            <button type="button" onClick={() => choose("")}>Limpar</button>
            <button type="button" onClick={() => choose(toDateValue(new Date()))}>Hoje</button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
