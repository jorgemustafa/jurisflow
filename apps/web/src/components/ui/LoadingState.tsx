import type { CSSProperties } from "react";

type LoadingStateProps = {
  label: string;
  variant?: "page" | "table" | "metrics" | "list";
  columns?: number;
  items?: number;
};

export const LoadingState = ({ label, variant = "page", columns = 5, items = 5 }: LoadingStateProps) => (
  <div className={`loading-state loading-${variant}`} role="status" aria-label={label}>
    <span className="loading-label">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
    {variant === "table" ? (
      <div className="skeleton-table" style={{ "--skeleton-columns": columns } as CSSProperties} aria-hidden="true">
        {Array.from({ length: columns * (items + 1) }, (_, index) => <span className="skeleton" key={index} />)}
      </div>
    ) : null}
    {variant === "metrics" ? (
      <div className="metric-grid skeleton-metrics" aria-hidden="true">
        {Array.from({ length: items }, (_, index) => <span className="skeleton metric-card" key={index} />)}
      </div>
    ) : null}
    {variant === "list" ? (
      <div className="skeleton-list" aria-hidden="true">
        {Array.from({ length: items }, (_, index) => <span className="skeleton" key={index} />)}
      </div>
    ) : null}
  </div>
);
