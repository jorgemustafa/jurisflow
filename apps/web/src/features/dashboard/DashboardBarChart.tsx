type DashboardBar = {
  label: string;
  value: number;
  color: string;
};

type DashboardBarChartProps = {
  title: string;
  bars: DashboardBar[];
};

export const DashboardBarChart = ({ title, bars }: DashboardBarChartProps) => {
  const max = Math.max(...bars.map((bar) => bar.value), 1);

  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      <div className="bar-chart">
        {bars.map((bar) => (
          <div className="bar-row" key={bar.label}>
            <span>{bar.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(bar.value / max) * 100}%`, background: bar.color }} />
            </div>
            <strong>{bar.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};
