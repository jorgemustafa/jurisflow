import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { listCases } from "src/services/cases.js";
import { listClients } from "src/services/clients.js";
import {
  cancelPayment,
  createPayment,
  listPayments,
  markPaymentPaid,
  updatePayment,
  type Payment,
  type PaymentMethod,
  type PaymentStatus
} from "src/services/finance.js";
import { ApiError } from "src/services/http.js";
import { formatDate, formatMoney } from "src/utils/format.js";
import { Metric } from "src/features/finance/Metric.js";
import { currentMonth } from "src/features/finance/utils/currentMonth.js";
import { buildPaymentPlanSummaries } from "src/features/finance/utils/paymentPlans.js";

const today = () => new Date().toISOString().slice(0, 10);

const statusLabels: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Recebido",
  canceled: "Cancelado"
};

const methodLabels: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  bank_transfer: "Transferência",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
  other: "Outro"
};

const isOverdue = (payment: Payment) => payment.status === "pending" && payment.dueDate.slice(0, 10) < today();

const moveMonth = (month: string, delta: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
};

const parseMoney = (value: string) => {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
};

type RowAction = { id: string; mode: "receive" | "edit" | "cancel" | "fix-paid-date" } | null;
type StatusFilter = PaymentStatus | "all";

type ReceiveState = { paidAt: string; paymentMethod: PaymentMethod };

const emptyNewPayment = { clientId: "", caseId: "", description: "", amount: "", dueDate: today(), notes: "" };

export const FinancePage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [action, setAction] = useState<RowAction>(null);
  const [receive, setReceive] = useState<ReceiveState>({ paidAt: today(), paymentMethod: "pix" });
  const [editForm, setEditForm] = useState({ dueDate: "", description: "", amount: "", notes: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [fixPaidAt, setFixPaidAt] = useState(today());
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [newPayment, setNewPayment] = useState(emptyNewPayment);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const payments = useQuery({ queryKey: ["payments", { month, status: "all" }], queryFn: () => listPayments({ month, status: "all" }) });
  const planPayments = useQuery({ queryKey: ["payments", "plans"], queryFn: () => listPayments({ status: "all" }) });
  const clients = useQuery({
    queryKey: ["clients", "finance"],
    queryFn: () => listClients({ q: "", status: "active", type: "all" }),
    enabled: showNewPayment
  });
  const clientCases = useQuery({
    queryKey: ["cases", "finance", newPayment.clientId],
    queryFn: () => listCases({ q: "", status: "all", caseType: "all", stage: "all", legalArea: "all", clientId: newPayment.clientId }),
    enabled: showNewPayment && Boolean(newPayment.clientId)
  });

  const plans = planPayments.data ? buildPaymentPlanSummaries(planPayments.data) : [];

  const monthPayments = useMemo(() => {
    const items = [...(payments.data ?? [])];
    items.sort((a, b) => {
      const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
      if (overdueDiff !== 0) return overdueDiff;
      return a.dueDate.localeCompare(b.dueDate);
    });
    return items;
  }, [payments.data]);

  const summary = useMemo(() => {
    const base = { paid: 0, open: 0, overdue: 0, counts: { all: 0, pending: 0, paid: 0, canceled: 0 } };
    for (const payment of payments.data ?? []) {
      base.counts.all += 1;
      base.counts[payment.status] += 1;
      if (payment.status === "paid") base.paid += payment.amountCents;
      else if (payment.status === "pending") {
        if (isOverdue(payment)) base.overdue += payment.amountCents;
        else base.open += payment.amountCents;
      }
    }
    return base;
  }, [payments.data]);

  const visiblePayments = statusFilter === "all" ? monthPayments : monthPayments.filter((payment) => payment.status === statusFilter);

  const onMutationSuccess = () => {
    setError("");
    setAction(null);
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
  };
  const onMutationError = (failure: unknown, fallback: string) =>
    setError(failure instanceof ApiError ? failure.message : fallback);

  const paidMutation = useMutation({
    mutationFn: (id: string) => markPaymentPaid(id, receive),
    onSuccess: onMutationSuccess,
    onError: (failure) => onMutationError(failure, "Não foi possível registrar o recebimento.")
  });
  const updateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof updatePayment>[1] }) => updatePayment(variables.id, variables.data),
    onSuccess: onMutationSuccess,
    onError: (failure) => onMutationError(failure, "Não foi possível atualizar o pagamento.")
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelPayment(id, { cancelReason }),
    onSuccess: () => {
      setCancelReason("");
      onMutationSuccess();
    },
    onError: (failure) => onMutationError(failure, "Não foi possível cancelar o pagamento.")
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createPayment({
        clientId: newPayment.clientId,
        caseId: newPayment.caseId || undefined,
        description: newPayment.description,
        amountCents: parseMoney(newPayment.amount),
        dueDate: newPayment.dueDate,
        notes: newPayment.notes || undefined
      }),
    onSuccess: () => {
      setNewPayment(emptyNewPayment);
      setShowNewPayment(false);
      onMutationSuccess();
    },
    onError: (failure) => onMutationError(failure, "Não foi possível criar o pagamento.")
  });

  const isBusy = paidMutation.isPending || updateMutation.isPending || cancelMutation.isPending || createMutation.isPending;

  const openAction = (payment: Payment, mode: NonNullable<RowAction>["mode"]) => {
    setError("");
    if (mode === "receive") setReceive({ paidAt: today(), paymentMethod: payment.paymentMethod ?? "pix" });
    if (mode === "edit")
      setEditForm({
        dueDate: payment.dueDate.slice(0, 10),
        description: payment.description,
        amount: (payment.amountCents / 100).toFixed(2).replace(".", ","),
        notes: payment.notes ?? ""
      });
    if (mode === "cancel") setCancelReason("");
    if (mode === "fix-paid-date") setFixPaidAt(payment.paidAt ? payment.paidAt.slice(0, 10) : today());
    setAction({ id: payment.id, mode });
  };

  const submitEdit = (payment: Payment) => {
    const data: Parameters<typeof updatePayment>[1] = {
      dueDate: editForm.dueDate,
      description: editForm.description,
      notes: editForm.notes === "" ? null : editForm.notes
    };
    if (payment.source === "manual") {
      const cents = parseMoney(editForm.amount);
      if (!Number.isFinite(cents) || cents <= 0) {
        setError("Informe um valor válido.");
        return;
      }
      data.amountCents = cents;
    }
    updateMutation.mutate({ id: payment.id, data });
  };

  const canCreate =
    newPayment.clientId && newPayment.description.trim().length >= 2 && newPayment.dueDate && Number.isFinite(parseMoney(newPayment.amount)) && parseMoney(newPayment.amount) > 0;

  const actionRow = (payment: Payment) => {
    if (!action || action.id !== payment.id) return null;

    return (
      <tr className="row-editor" key={`${payment.id}-editor`}>
        <td colSpan={9}>
          {action.mode === "receive" ? (
            <div className="row-editor-form">
              <label>
                Recebido em
                <input type="date" value={receive.paidAt} onChange={(event) => setReceive((current) => ({ ...current, paidAt: event.target.value }))} />
              </label>
              <label>
                Forma de pagamento
                <select
                  value={receive.paymentMethod}
                  onChange={(event) => setReceive((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}
                >
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary" disabled={isBusy} onClick={() => paidMutation.mutate(payment.id)}>
                <Check size={16} />
                Confirmar recebimento de {formatMoney(payment.amountCents)}
              </button>
              <button className="button" disabled={isBusy} onClick={() => setAction(null)}>
                Cancelar
              </button>
            </div>
          ) : null}

          {action.mode === "edit" ? (
            <div className="row-editor-form">
              <label>
                Vencimento
                <input type="date" value={editForm.dueDate} onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </label>
              <label>
                Descrição
                <input value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label>
                Valor (R$)
                <input
                  value={editForm.amount}
                  disabled={payment.source === "generated"}
                  title={payment.source === "generated" ? "Valor de parcela gerada é travado" : undefined}
                  onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>
              <label>
                Observações
                <input value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
              <button className="button primary" disabled={isBusy} onClick={() => submitEdit(payment)}>
                Salvar
              </button>
              <button className="button" disabled={isBusy} onClick={() => setAction(null)}>
                Cancelar
              </button>
            </div>
          ) : null}

          {action.mode === "cancel" ? (
            <div className="row-editor-form">
              <label className="grow">
                Motivo do cancelamento
                <input value={cancelReason} placeholder="Ex.: lançamento duplicado" onChange={(event) => setCancelReason(event.target.value)} />
              </label>
              <button className="button danger" disabled={isBusy || cancelReason.trim().length < 2} onClick={() => cancelMutation.mutate(payment.id)}>
                <Ban size={16} />
                Confirmar cancelamento
              </button>
              <button className="button" disabled={isBusy} onClick={() => setAction(null)}>
                Voltar
              </button>
            </div>
          ) : null}

          {action.mode === "fix-paid-date" ? (
            <div className="row-editor-form">
              <label>
                Data de recebimento
                <input type="date" value={fixPaidAt} onChange={(event) => setFixPaidAt(event.target.value)} />
              </label>
              <button
                className="button primary"
                disabled={isBusy}
                onClick={() => updateMutation.mutate({ id: payment.id, data: { paidAt: fixPaidAt } })}
              >
                Salvar
              </button>
              <button className="button" disabled={isBusy} onClick={() => setAction(null)}>
                Cancelar
              </button>
            </div>
          ) : null}
        </td>
      </tr>
    );
  };

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Financeiro</span>
          <h1>Pagamentos</h1>
        </div>
        <div className="actions">
          <div className="month-nav">
            <button className="button" type="button" title="Mês anterior" onClick={() => setMonth((current) => moveMonth(current, -1))}>
              <ChevronLeft size={16} />
            </button>
            <input className="month-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <button className="button" type="button" title="Próximo mês" onClick={() => setMonth((current) => moveMonth(current, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="button primary" type="button" onClick={() => setShowNewPayment((current) => !current)}>
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
              <select value={newPayment.clientId} onChange={(event) => setNewPayment((current) => ({ ...current, clientId: event.target.value, caseId: "" }))}>
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
              <select value={newPayment.caseId} disabled={!newPayment.clientId} onChange={(event) => setNewPayment((current) => ({ ...current, caseId: event.target.value }))}>
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
              <input value={newPayment.description} placeholder="Ex.: consulta avulsa" onChange={(event) => setNewPayment((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label>
              Valor (R$)
              <input value={newPayment.amount} placeholder="0,00" onChange={(event) => setNewPayment((current) => ({ ...current, amount: event.target.value }))} />
            </label>
            <label>
              Vencimento
              <input type="date" value={newPayment.dueDate} onChange={(event) => setNewPayment((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              Observações
              <input value={newPayment.notes} onChange={(event) => setNewPayment((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <button className="button primary" disabled={!canCreate || isBusy} onClick={() => createMutation.mutate()}>
              Criar pagamento
            </button>
          </div>
        </section>
      ) : null}

      <section className="metric-grid finance-metrics">
        <Metric label={`Recebido em ${monthLabel(month)}`} value={formatMoney(summary.paid)} />
        <Metric label="A vencer no mês" value={formatMoney(summary.open)} />
        <Metric label="Em atraso no mês" value={formatMoney(summary.overdue)} />
        <Metric label="Total do mês" value={formatMoney(summary.paid + summary.open + summary.overdue)} />
      </section>

      {error ? <p className="alert">{error}</p> : null}

      <section className="panel">
        <div className="panel-header">
          <h2>Pagamentos do mês</h2>
          <div className="chip-row">
            {([
              ["all", `Todos (${summary.counts.all})`],
              ["pending", `Pendentes (${summary.counts.pending})`],
              ["paid", `Recebidos (${summary.counts.paid})`],
              ["canceled", `Cancelados (${summary.counts.canceled})`]
            ] as [StatusFilter, string][]).map(([value, label]) => (
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

        {payments.isLoading ? <p>Carregando pagamentos...</p> : null}
        {payments.isError ? <p className="alert">Não foi possível carregar os pagamentos.</p> : null}

        {visiblePayments.length === 0 && !payments.isLoading ? (
          <p className="empty">Nenhum pagamento encontrado para o mês selecionado.</p>
        ) : visiblePayments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Processo</th>
                  <th>Parcela</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Recebimento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiblePayments.flatMap((payment) => {
                  const overdue = isOverdue(payment);
                  return [
                    <tr key={payment.id} className={overdue ? "overdue-row" : undefined}>
                      <td>{payment.clientName ?? payment.clientId}</td>
                      <td>{payment.caseTitle ?? "—"}</td>
                      <td>
                        {payment.installmentNumber}/{payment.installmentTotal}
                      </td>
                      <td>
                        <strong>{formatMoney(payment.amountCents)}</strong>
                      </td>
                      <td>{formatDate(payment.dueDate)}</td>
                      <td>
                        <span className={`badge ${overdue ? "overdue" : payment.status === "paid" ? "active" : payment.status === "canceled" ? "inactive" : "due_soon"}`}>
                          {overdue ? "Atrasado" : statusLabels[payment.status]}
                        </span>
                      </td>
                      <td>
                        {payment.paidAt ? (
                          <>
                            {formatDate(payment.paidAt)}
                            {payment.paymentMethod ? <small className="muted"> · {methodLabels[payment.paymentMethod]}</small> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {payment.status === "pending" ? (
                            <>
                              <button className="button primary small" disabled={isBusy} onClick={() => openAction(payment, "receive")}>
                                <Check size={14} />
                                Receber
                              </button>
                              <button className="button small" title="Editar" disabled={isBusy} onClick={() => openAction(payment, "edit")}>
                                <Pencil size={14} />
                              </button>
                              <button className="button small" title="Cancelar pagamento" disabled={isBusy} onClick={() => openAction(payment, "cancel")}>
                                <Ban size={14} />
                              </button>
                            </>
                          ) : null}
                          {payment.status === "paid" ? (
                            <>
                              <button className="button small" disabled={isBusy} onClick={() => openAction(payment, "fix-paid-date")}>
                                Corrigir data
                              </button>
                              <button className="button small" title="Cancelar pagamento" disabled={isBusy} onClick={() => openAction(payment, "cancel")}>
                                <Ban size={14} />
                              </button>
                            </>
                          ) : null}
                          {payment.status === "canceled" ? <small className="muted">{payment.cancelReason ?? "Cancelado"}</small> : null}
                        </div>
                      </td>
                    </tr>,
                    actionRow(payment)
                  ].filter(Boolean);
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Parcelas por processo</h2>
        {planPayments.isLoading ? <p>Carregando parcelas dos processos...</p> : null}
        {planPayments.isError ? <p className="alert">Não foi possível carregar o resumo de parcelas.</p> : null}
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
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const done = plan.paidInstallments;
                  const total = plan.paidInstallments + plan.pendingInstallments;
                  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={plan.id}>
                      <td>{plan.clientName}</td>
                      <td>{plan.caseTitle}</td>
                      <td>{formatMoney(plan.totalCents)}</td>
                      <td>
                        <div className="progress" title={`${done} de ${total} parcelas recebidas`}>
                          <div className="progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                        <small className="muted">
                          {done}/{total} parcelas ({percent}%)
                          {plan.canceledInstallments > 0 ? ` · ${plan.canceledInstallments} cancelada(s)` : ""}
                        </small>
                      </td>
                      <td>{formatMoney(plan.paidCents)}</td>
                      <td>{formatMoney(plan.pendingCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : !planPayments.isLoading ? (
          <p className="empty-inline">Nenhum plano de parcelas cadastrado.</p>
        ) : null}
      </section>
    </>
  );
};
