import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CalendarDays,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { LoadingState } from "src/components/ui/LoadingState.js";
import { DateInput } from "src/components/ui/DateInput.js";
import { MonthPicker } from "src/components/ui/MonthPicker.js";
import { Tabs } from "src/components/ui/Tabs.js";
import { CasePaymentsPanel } from "src/features/finance/CasePaymentsPanel.js";
import { Metric } from "src/features/finance/Metric.js";
import { PaymentsTable } from "src/features/finance/PaymentsTable.js";
import { currentMonth } from "src/features/finance/utils/currentMonth.js";
import { isPaymentOverdue } from "src/features/finance/utils/isPaymentOverdue.js";
import { parseMoney } from "src/features/finance/utils/money.js";
import { buildMonthSummary } from "src/features/finance/utils/monthSummary.js";
import { buildPaymentPlanSummaries } from "src/features/finance/utils/paymentPlans.js";
import { listCases } from "src/services/cases.js";
import { listClients } from "src/services/clients.js";
import {
  createPayment,
  listPayments,
  type PaymentStatus,
} from "src/services/finance.js";
import { ApiError } from "src/services/http.js";
import { formatMoney } from "src/utils/format.js";
import { monthLabel, moveMonth } from "src/utils/month.js";

const today = () => new Date().toISOString().slice(0, 10);

type StatusFilter = PaymentStatus | "all";
const emptyNewPayment = {
  clientId: "",
  caseId: "",
  description: "",
  amount: "",
  dueDate: today(),
  notes: "",
};

export const FinancePage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState<"payments" | "plans">("payments");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [newPayment, setNewPayment] = useState(emptyNewPayment);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const payments = useQuery({
    queryKey: ["payments", { month, status: "all" }],
    queryFn: () => listPayments({ month, status: "all" }),
  });
  const planPayments = useQuery({
    queryKey: ["payments", "plans"],
    queryFn: () => listPayments({ status: "all" }),
    enabled: tab === "plans",
  });
  const clients = useQuery({
    queryKey: ["clients", "finance"],
    queryFn: () => listClients({ q: "", status: "active", type: "all" }),
    enabled: showNewPayment,
  });
  const clientCases = useQuery({
    queryKey: ["cases", "finance", newPayment.clientId],
    queryFn: () =>
      listCases({
        q: "",
        status: "all",
        caseType: "all",
        stage: "all",
        legalArea: "all",
        clientId: newPayment.clientId,
      }),
    enabled: showNewPayment && Boolean(newPayment.clientId),
  });

  const plans = planPayments.data
    ? buildPaymentPlanSummaries(planPayments.data)
    : [];
  const monthPayments = useMemo(() => {
    const items = [...(payments.data ?? [])];
    return items.sort(
      (left, right) =>
        Number(isPaymentOverdue(right)) - Number(isPaymentOverdue(left)) ||
        left.dueDate.localeCompare(right.dueDate),
    );
  }, [month, payments.data]);

  const summary = useMemo(
    () => buildMonthSummary(payments.data ?? [], month),
    [month, payments.data],
  );

  const visiblePayments =
    statusFilter === "all"
      ? monthPayments
      : monthPayments.filter((payment) => payment.status === statusFilter);
  const createMutation = useMutation({
    mutationFn: () =>
      createPayment({
        clientId: newPayment.clientId,
        caseId: newPayment.caseId || undefined,
        description: newPayment.description,
        amountCents: parseMoney(newPayment.amount),
        dueDate: newPayment.dueDate,
        notes: newPayment.notes || undefined,
      }),
    onSuccess: () => {
      setError("");
      setNewPayment(emptyNewPayment);
      setShowNewPayment(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
    onError: (failure) =>
      setError(
        failure instanceof ApiError
          ? failure.message
          : "Não foi possível criar o pagamento.",
      ),
  });
  const canCreate =
    newPayment.clientId &&
    newPayment.description.trim().length >= 2 &&
    newPayment.dueDate &&
    parseMoney(newPayment.amount) > 0;

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Financeiro</span>
        </div>
        <div className="actions">
          <div className="finance-period">
            <div className="finance-period-label">
              <CalendarDays size={15} />
              Competência
            </div>
            <div className="month-nav">
              <button
                className="button"
                type="button"
                title="Mês anterior"
                onClick={() => setMonth((current) => moveMonth(current, -1))}
              >
                <ChevronLeft size={16} />
              </button>
              <MonthPicker value={month} onChange={setMonth} />
              <button
                className="button"
                type="button"
                title="Próximo mês"
                onClick={() => setMonth((current) => moveMonth(current, 1))}
              >
                <ChevronRight size={16} />
              </button>
              {month !== currentMonth() ? (
                <button
                  className="finance-period-today"
                  type="button"
                  onClick={() => setMonth(currentMonth())}
                >
                  Mês atual
                </button>
              ) : null}
            </div>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => setShowNewPayment((current) => !current)}
          >
            {showNewPayment ? <X size={16} /> : <Plus size={16} />}
            {showNewPayment ? "Fechar" : "Novo pagamento"}
          </button>
        </div>
      </header>

      {showNewPayment ? (
        <section className="panel">
          <h2>Novo pagamento avulso</h2>
          <div className="row-editor-form">
            <label>
              Cliente
              <select
                value={newPayment.clientId}
                onChange={(event) =>
                  setNewPayment((current) => ({
                    ...current,
                    clientId: event.target.value,
                    caseId: "",
                  }))
                }
              >
                <option value="">Selecione</option>
                {clients.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Processo (opcional)
              <select
                value={newPayment.caseId}
                disabled={!newPayment.clientId}
                onChange={(event) =>
                  setNewPayment((current) => ({
                    ...current,
                    caseId: event.target.value,
                  }))
                }
              >
                <option value="">Sem processo</option>
                {clientCases.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descrição
              <input
                value={newPayment.description}
                onChange={(event) =>
                  setNewPayment((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Valor (R$)
              <input
                value={newPayment.amount}
                onChange={(event) =>
                  setNewPayment((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Vencimento
              <DateInput
                value={newPayment.dueDate}
                onChange={(event) =>
                  setNewPayment((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Observações
              <input
                value={newPayment.notes}
                onChange={(event) =>
                  setNewPayment((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <button
              className="button primary"
              disabled={!canCreate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Criar pagamento
            </button>
          </div>
        </section>
      ) : null}

      {payments.isLoading ? <LoadingState label="Carregando indicadores financeiros" variant="metrics" items={4} /> : <section className="metric-grid finance-metrics">
        <Metric
          label={`Recebido em ${monthLabel(month)}`}
          value={formatMoney(summary.received)}
        />
        <Metric label="A vencer no mês" value={formatMoney(summary.open)} />
        <Metric label="Em atraso" value={formatMoney(summary.overdue)} />
        <Metric
          label="Total previsto no mês"
          value={formatMoney(summary.scheduled)}
        />
      </section>}
      {error ? <p className="alert">{error}</p> : null}

      <Tabs
        ariaLabel="Seções financeiras"
        tabs={[{ value: "payments", label: "Pagamentos do mês" }, { value: "plans", label: "Parcelas por processo" }]}
        value={tab}
        onChange={setTab}
      />

      {tab === "payments" ? <section className="panel">
        <div className="panel-header">
          <div className="chip-row">
            {(
              [
                ["all", `Todos (${summary.counts.all})`],
                ["pending", `Pendentes (${summary.counts.pending})`],
                ["paid", `Recebidos (${summary.counts.paid})`],
                ["canceled", `Cancelados (${summary.counts.canceled})`],
              ] as [StatusFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip ${statusFilter === value ? "chip-active" : ""}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {payments.isLoading ? <LoadingState label="Carregando pagamentos" variant="table" columns={7} /> : null}
        {payments.isError ? (
          <p className="alert">Não foi possível carregar os pagamentos.</p>
        ) : null}
        {!payments.isLoading ? (
          <PaymentsTable
            payments={visiblePayments}
            month={month}
            empty="Nenhum pagamento encontrado para o mês selecionado."
          />
        ) : null}
      </section> : null}

      {tab === "plans" ? <section className="panel">
        {planPayments.isLoading ? <LoadingState label="Carregando parcelas dos processos" variant="table" columns={6} /> : null}
        {planPayments.isError ? (
          <p className="alert">
            Não foi possível carregar o resumo de parcelas.
          </p>
        ) : null}
        {plans.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Processo</th>
                  <th>Valor total</th>
                  <th>Progresso</th>
                  <th>Recebido</th>
                  <th>Pendente</th>
                  <th>Último pgto.</th>
                </tr>
              </thead>
              <tbody>
                {plans.flatMap((plan) => {
                  const percent =
                    plan.installmentCount > 0
                      ? Math.round(
                          (plan.paidInstallments / plan.installmentCount) * 100,
                        )
                      : 0;
                  const expanded = expandedCaseId === plan.caseId;
                  return [
                    <tr
                      key={plan.id}
                      className="clickable-row"
                      onClick={() =>
                        setExpandedCaseId(expanded ? null : plan.caseId)
                      }
                    >
                      <td>{plan.clientName}</td>
                      <td>{plan.caseTitle}</td>
                      <td>{formatMoney(plan.totalCents)}</td>
                      <td>
                        <div
                          className="progress"
                          title={`${plan.paidInstallments} de ${plan.installmentCount} parcelas recebidas`}
                        >
                          <div
                            className="progress-fill"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <small className="muted">
                          {plan.paidInstallments}/{plan.installmentCount}{" "}
                          parcelas ({percent}%)
                        </small>
                      </td>
                      <td>
                        {plan.lastPaymentDueDate
                          ? monthLabel(plan.lastPaymentDueDate.slice(0, 7))
                          : "—"}
                      </td>
                      <td>{formatMoney(plan.paidCents)}</td>
                      <td>
                        <span className="expand-cell">
                          {formatMoney(plan.pendingCents)}
                          {expanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </span>
                      </td>
                    </tr>,
                    expanded ? (
                      <tr
                        className="expanded-payment-row"
                        key={`${plan.id}-payments`}
                      >
                        <td colSpan={7}>
                          <CasePaymentsPanel
                            caseId={plan.caseId}
                          />
                        </td>
                      </tr>
                    ) : null,
                  ].filter(Boolean);
                })}
              </tbody>
            </table>
          </div>
        ) : !planPayments.isLoading ? (
          <p className="empty-inline">Nenhum plano de parcelas cadastrado.</p>
        ) : null}
      </section> : null}
    </>
  );
};
