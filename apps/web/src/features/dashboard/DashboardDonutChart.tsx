type DashboardChartSegment = {
  label: string;
  value: number;
  color: string;
  detail: string;
};

type DashboardDonutChartProps = {
  title: string;
  totalLabel: string;
  segments: DashboardChartSegment[];
};

export const DashboardDonutChart = ({ title, totalLabel, segments }: DashboardDonutChartProps) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;
  const gradient = total
    ? segments
        .map((segment) => {
          const start = cursor;
          cursor += (segment.value / total) * 100;
          return `${segment.color} ${start}% ${cursor}%`;
        })
        .join(", ")
    : "var(--color-surface-muted) 0% 100%";

  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      <div className="donut-layout">
        <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
          <div>
            <strong>{totalLabel}</strong>
            <span>Total</span>
          </div>
        </div>
        <div className="chart-legend">
          {segments.map((segment) => (
            <div className="legend-row" key={segment.label}>
              <span style={{ background: segment.color }} />
              <div>
                <strong>{segment.label}</strong>
                <small>{segment.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
