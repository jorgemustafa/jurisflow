import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getFinanceDashboard } from "../../services/finance.js";
import { formatMoney } from "../../utils/format.js";
import { Metric } from "./Metric.js";
import { PaymentSummaryList } from "./PaymentSummaryList.js";
import { currentMonth } from "./utils/currentMonth.js";

export const FinancePage = () => {
  const [month, setMonth] = useState(currentMonth());
  const dashboard = useQuery({
    queryKey: ["finance-dashboard", month],
    queryFn: () => getFinanceDashboard(month)
  });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Financeiro</span>
          <h1>Dashboard financeiro</h1>
        </div>
        <input className="month-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </header>

      {dashboard.isLoading ? <p>Carregando financeiro...</p> : null}
      {dashboard.isError ? <p className="alert">Não foi possível carregar o dashboard financeiro.</p> : null}

      {dashboard.data ? (
        <>
          <section className="metric-grid">
            <Metric label="Recebido no mês" value={formatMoney(dashboard.data.receivedInMonthCents)} />
            <Metric label="A vencer no mês" value={formatMoney(dashboard.data.dueInMonthCents)} />
            <Metric label="A receber" value={formatMoney(dashboard.data.totalToReceiveCents)} />
            <Metric label="Em atraso" value={formatMoney(dashboard.data.overdueAmountCents)} />
            <Metric label="Clientes ativos" value={String(dashboard.data.activeClients)} />
            <Metric label="Processos em andamento" value={String(dashboard.data.runningCases)} />
          </section>

          <PaymentSummaryList title="Pagamentos em atraso" payments={dashboard.data.overduePayments} empty="Nenhum pagamento em atraso." />
          <PaymentSummaryList
            title="Vencimentos do mês"
            payments={dashboard.data.upcomingPayments}
            empty="Nenhum vencimento pendente no mês selecionado."
          />
        </>
      ) : null}
    </>
  );
};
