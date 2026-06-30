import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCases } from "src/services/cases.js";
import { listClients } from "src/services/clients.js";
import { listDeadlines } from "src/services/deadlines.js";
import { getFinanceDashboard } from "src/services/finance.js";
import { formatMoney } from "src/utils/format.js";
import { Metric } from "src/features/finance/Metric.js";
import { currentMonth } from "src/features/finance/utils/currentMonth.js";
import { DashboardBarChart } from "src/features/dashboard/DashboardBarChart.js";
import { DashboardDonutChart } from "src/features/dashboard/DashboardDonutChart.js";
import { LoadingState } from "src/components/ui/LoadingState.js";
import { MonthPicker } from "src/components/ui/MonthPicker.js";

const percent = (value: number, total: number) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "0%");

export const DashboardPage = () => {
  const [month, setMonth] = useState(currentMonth());
  const finance = useQuery({ queryKey: ["finance-dashboard", month], queryFn: () => getFinanceDashboard(month) });
  const clients = useQuery({
    queryKey: ["clients", "dashboard"],
    queryFn: () => listClients({ q: "", status: "all", type: "all" })
  });
  const cases = useQuery({
    queryKey: ["cases", "dashboard"],
    queryFn: () => listCases({ q: "", status: "all", caseType: "all", stage: "all", legalArea: "all" })
  });
  const deadlines = useQuery({
    queryKey: ["deadlines", "dashboard"],
    queryFn: () => listDeadlines({ status: "pending", alertWindowDays: "7" })
  });

  const isLoading = finance.isLoading || clients.isLoading || cases.isLoading || deadlines.isLoading;
  const isError = finance.isError || clients.isError || cases.isError || deadlines.isError;

  const activeClients = clients.data?.filter((client) => client.status === "active").length ?? 0;
  const inactiveClients = clients.data?.filter((client) => client.status === "inactive").length ?? 0;
  const activeCases = cases.data?.filter((item) => item.status === "active").length ?? 0;
  const onHoldCases = cases.data?.filter((item) => item.status === "on_hold").length ?? 0;
  const closedCases = cases.data?.filter((item) => item.status === "closed").length ?? 0;
  const canceledCases = cases.data?.filter((item) => item.status === "canceled").length ?? 0;
  const judicialCases = cases.data?.filter((item) => item.caseType === "judicial").length ?? 0;
  const extrajudicialCases = cases.data?.filter((item) => item.caseType === "extrajudicial").length ?? 0;

  const financialTotal =
    (finance.data?.monthPaidCents ?? 0) + (finance.data?.monthOpenCents ?? 0) + (finance.data?.monthOverdueCents ?? 0);
  const overdueCount = finance.data?.overduePayments.length ?? 0;
  const upcomingCount = finance.data?.upcomingPayments.length ?? 0;
  const deadlineAlerts = deadlines.data?.filter((item) => item.alertLevel !== "none").length ?? 0;

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Escritório jurídico</span>
          <h1>Visão geral</h1>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </header>

      {isLoading ? <LoadingState label="Carregando indicadores" variant="metrics" items={6} /> : null}
      {isError ? <p className="alert">Não foi possível carregar a visão geral.</p> : null}

      {!isLoading && !isError ? (
        <>
          <section className="metric-grid">
            <Metric label="Recebido no mês" value={formatMoney(finance.data?.receivedInMonthCents ?? 0)} />
            <Metric label="A receber" value={formatMoney(finance.data?.totalToReceiveCents ?? 0)} />
            <Metric label="Em atraso" value={formatMoney(finance.data?.overdueAmountCents ?? 0)} />
            <Metric label="Clientes ativos" value={String(activeClients)} />
            <Metric label="Processos ativos" value={String(activeCases)} />
            <Metric label="Alertas de prazo" value={String(deadlineAlerts)} />
          </section>

          <section className="chart-grid">
            <DashboardDonutChart
              title="Parcelas do mês"
              totalLabel={formatMoney(financialTotal)}
              segments={[
                {
                  label: "Recebidas",
                  value: finance.data?.monthPaidCents ?? 0,
                  color: "#0f766e",
                  detail: percent(finance.data?.monthPaidCents ?? 0, financialTotal)
                },
                {
                  label: "A vencer",
                  value: finance.data?.monthOpenCents ?? 0,
                  color: "#2563eb",
                  detail: percent(finance.data?.monthOpenCents ?? 0, financialTotal)
                },
                {
                  label: "Em atraso",
                  value: finance.data?.monthOverdueCents ?? 0,
                  color: "#b42318",
                  detail: percent(finance.data?.monthOverdueCents ?? 0, financialTotal)
                }
              ]}
            />
            <DashboardBarChart
              title="Processos por status"
              bars={[
                { label: "Ativos", value: activeCases, color: "#0f766e" },
                { label: "Pausados", value: onHoldCases, color: "#d97706" },
                { label: "Encerrados", value: closedCases, color: "#2563eb" },
                { label: "Cancelados", value: canceledCases, color: "#b42318" }
              ]}
            />
            <DashboardBarChart
              title="Carteira operacional"
              bars={[
                { label: "Clientes ativos", value: activeClients, color: "#0f766e" },
                { label: "Clientes inativos", value: inactiveClients, color: "#9a3412" },
                { label: "Judiciais", value: judicialCases, color: "#2563eb" },
                { label: "Extrajudiciais", value: extrajudicialCases, color: "#7c3aed" },
                { label: "Financeiro", value: upcomingCount + overdueCount, color: "#64748b" },
                { label: "Prazos", value: deadlineAlerts, color: "#b42318" }
              ]}
            />
          </section>
        </>
      ) : null}
    </>
  );
};
