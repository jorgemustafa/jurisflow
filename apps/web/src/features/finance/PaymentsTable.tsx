import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Pencil } from "lucide-react";
import { useState } from "react";
import { isPaymentOverdue } from "src/features/finance/utils/isPaymentOverdue.js";
import {
  moneyInputValue,
  parseMoney,
} from "src/features/finance/utils/money.js";
import {
  cancelPayment,
  markPaymentPaid,
  updatePayment,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from "src/services/finance.js";
import { ApiError } from "src/services/http.js";
import { formatDate, formatMoney } from "src/utils/format.js";
import { DateInput } from "src/components/ui/DateInput.js";
import { useToast } from "src/components/ui/Toast.js";

const today = () => new Date().toISOString().slice(0, 10);

const statusLabels: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Recebido",
  canceled: "Cancelado",
};
const methodLabels: Record<PaymentMethod, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  bank_transfer: "Transferência",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
  other: "Outro",
};

type RowAction = {
  id: string;
  mode: "receive" | "edit" | "cancel" | "fix-paid-date";
} | null;

type PaymentsTableProps = {
  payments: Payment[];
  month?: string;
  showClient?: boolean;
  showCase?: boolean;
  empty?: string;
};

const installmentLabel = (payment: Payment) => {
  if (payment.source === "manual") return "Avulso";
  return payment.installmentNumber === 0
    ? "Entrada"
    : `${payment.installmentNumber}/${payment.installmentTotal}`;
};

const competenceLabel = (payment: Payment, month?: string) => {
  const competence = payment.dueDate.slice(0, 7);
  if (!month || competence === month) return null;
  const [year, monthNumber] = competence.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString(
    "pt-BR",
    { month: "short", year: "numeric", timeZone: "UTC" },
  );
};

export const PaymentsTable = ({
  payments,
  month,
  showClient = true,
  showCase = true,
  empty = "Nenhum pagamento encontrado.",
}: PaymentsTableProps) => {
  const [action, setAction] = useState<RowAction>(null);
  const [receive, setReceive] = useState<{
    paidAt: string;
    paymentMethod: PaymentMethod;
  }>({ paidAt: today(), paymentMethod: "pix" });
  const [editForm, setEditForm] = useState({
    dueDate: "",
    description: "",
    amount: "",
    notes: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [fixPaidAt, setFixPaidAt] = useState(today());
  const [error, setError] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const success = (message: string) => {
    showToast(message);
    setAction(null);
    setError("");
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
  };
  const failure = (cause: unknown, fallback: string) =>
    setError(cause instanceof ApiError ? cause.message : fallback);
  const paidMutation = useMutation({
    mutationFn: (id: string) => markPaymentPaid(id, receive),
    onSuccess: () => success("Pagamento recebido."),
    onError: (cause) =>
      failure(cause, "Não foi possível registrar o recebimento."),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updatePayment>[1];
    }) => updatePayment(id, data),
    onSuccess: () => success("Pagamento atualizado."),
    onError: (cause) =>
      failure(cause, "Não foi possível atualizar o pagamento."),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelPayment(id, { cancelReason }),
    onSuccess: () => success("Pagamento cancelado."),
    onError: (cause) =>
      failure(cause, "Não foi possível cancelar o pagamento."),
  });
  const isBusy =
    paidMutation.isPending ||
    updateMutation.isPending ||
    cancelMutation.isPending;

  const openAction = (
    payment: Payment,
    mode: NonNullable<RowAction>["mode"],
  ) => {
    setError("");
    if (mode === "receive")
      setReceive({
        paidAt: today(),
        paymentMethod: payment.paymentMethod ?? "pix",
      });
    if (mode === "edit")
      setEditForm({
        dueDate: payment.dueDate.slice(0, 10),
        description: payment.description,
        amount: moneyInputValue(payment.amountCents),
        notes: payment.notes ?? "",
      });
    if (mode === "cancel") setCancelReason("");
    if (mode === "fix-paid-date")
      setFixPaidAt(payment.paidAt?.slice(0, 10) ?? today());
    setAction({ id: payment.id, mode });
  };

  const submitEdit = (payment: Payment) => {
    if (payment.source === "generated" || payment.status !== "pending") {
      updateMutation.mutate({
        id: payment.id,
        data: { notes: editForm.notes || null },
      });
      return;
    }
    const amountCents = parseMoney(editForm.amount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    updateMutation.mutate({
      id: payment.id,
      data: {
        amountCents,
        dueDate: editForm.dueDate,
        description: editForm.description,
        notes: editForm.notes || null,
      },
    });
  };

  const columnCount = 6 + Number(showClient) + Number(showCase);
  const actionRow = (payment: Payment) => {
    if (!action || action.id !== payment.id) return null;
    return (
      <tr className="row-editor" key={`${payment.id}-editor`}>
        <td colSpan={columnCount}>
          {action.mode === "receive" ? (
            <div className="row-editor-form">
              <label>
                Recebido em
                <DateInput
                  value={receive.paidAt}
                  onChange={(event) =>
                    setReceive((current) => ({
                      ...current,
                      paidAt: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Forma de pagamento
                <select
                  value={receive.paymentMethod}
                  onChange={(event) =>
                    setReceive((current) => ({
                      ...current,
                      paymentMethod: event.target.value as PaymentMethod,
                    }))
                  }
                >
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button primary"
                disabled={isBusy}
                onClick={() => paidMutation.mutate(payment.id)}
              >
                <Check size={16} />
                Confirmar {formatMoney(payment.amountCents)}
              </button>
              <button
                className="button"
                disabled={isBusy}
                onClick={() => setAction(null)}
              >
                Voltar
              </button>
            </div>
          ) : null}
          {action.mode === "edit" ? (
            <div className="row-editor-form">
              {payment.source === "manual" && payment.status === "pending" ? (
                <>
                  <label>
                    Vencimento
                    <DateInput
                      value={editForm.dueDate}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          dueDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Descrição
                    <input
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Valor (R$)
                    <input
                      value={editForm.amount}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              ) : null}
              <label className="grow">
                Observações
                <input
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                className="button primary"
                disabled={isBusy}
                onClick={() => submitEdit(payment)}
              >
                Salvar
              </button>
              <button
                className="button"
                disabled={isBusy}
                onClick={() => setAction(null)}
              >
                Voltar
              </button>
            </div>
          ) : null}
          {action.mode === "cancel" ? (
            <div className="row-editor-form">
              <label className="grow">
                Motivo do cancelamento
                <input
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </label>
              <button
                className="button danger"
                disabled={isBusy || cancelReason.trim().length < 2}
                onClick={() => cancelMutation.mutate(payment.id)}
              >
                <Ban size={16} />
                Confirmar cancelamento
              </button>
              <button className="button" onClick={() => setAction(null)}>
                Voltar
              </button>
            </div>
          ) : null}
          {action.mode === "fix-paid-date" ? (
            <div className="row-editor-form">
              <label>
                Data de recebimento
                <DateInput
                  value={fixPaidAt}
                  onChange={(event) => setFixPaidAt(event.target.value)}
                />
              </label>
              <button
                className="button primary"
                disabled={isBusy}
                onClick={() =>
                  updateMutation.mutate({
                    id: payment.id,
                    data: { paidAt: fixPaidAt },
                  })
                }
              >
                Salvar
              </button>
              <button className="button" onClick={() => setAction(null)}>
                Voltar
              </button>
            </div>
          ) : null}
        </td>
      </tr>
    );
  };

  if (!payments.length) return <p className="empty">{empty}</p>;

  return (
    <>
      {error ? <p className="alert">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {showClient ? <th>Cliente</th> : null}
              {showCase ? <th>Processo</th> : null}
              <th>Parcela</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Recebimento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {payments.flatMap((payment) => {
              const overdue = isPaymentOverdue(payment);
              const competence = competenceLabel(payment, month);
              return [
                <tr
                  key={payment.id}
                  className={overdue ? "overdue-row" : undefined}
                >
                  {showClient ? (
                    <td>{payment.clientName ?? payment.clientId}</td>
                  ) : null}
                  {showCase ? <td>{payment.caseTitle ?? "—"}</td> : null}
                  <td>
                    {installmentLabel(payment)}
                    {competence ? (
                      <small className="competence-badge">
                        Referente a {competence}
                      </small>
                    ) : null}
                  </td>
                  <td>
                    <strong>{formatMoney(payment.amountCents)}</strong>
                  </td>
                  <td>{formatDate(payment.dueDate)}</td>
                  <td>
                    <span
                      className={`badge ${overdue ? "overdue" : payment.status === "paid" ? "active" : payment.status === "canceled" ? "inactive" : "due_soon"}`}
                    >
                      {overdue ? "Atrasado" : statusLabels[payment.status]}
                    </span>
                  </td>
                  <td>
                    {payment.paidAt ? (
                      <>
                        {formatDate(payment.paidAt)}
                        {payment.paymentMethod ? (
                          <small className="muted">
                            {" "}
                            · {methodLabels[payment.paymentMethod]}
                          </small>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {payment.status === "pending" ? (
                        <>
                          <button
                            className="button primary small"
                            disabled={isBusy}
                            onClick={() => openAction(payment, "receive")}
                          >
                            <Check size={14} />
                            Receber
                          </button>
                          <button
                            className="button small"
                            title="Editar observações"
                            disabled={isBusy}
                            onClick={() => openAction(payment, "edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          {payment.source === "manual" ? (
                            <button
                              className="button small"
                              title="Cancelar"
                              disabled={isBusy}
                              onClick={() => openAction(payment, "cancel")}
                            >
                              <Ban size={14} />
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      {payment.status === "paid" ? (
                        <>
                          <button
                            className="button small"
                            title="Editar observações"
                            disabled={isBusy}
                            onClick={() => openAction(payment, "edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          {payment.source === "manual" ? (
                            <>
                              <button
                                className="button small"
                                disabled={isBusy}
                                onClick={() =>
                                  openAction(payment, "fix-paid-date")
                                }
                              >
                                Corrigir data
                              </button>
                              <button
                                className="button small"
                                title="Cancelar"
                                disabled={isBusy}
                                onClick={() => openAction(payment, "cancel")}
                              >
                                <Ban size={14} />
                              </button>
                            </>
                          ) : null}
                        </>
                      ) : null}
                      {payment.status === "canceled" ? (
                        <small className="muted">
                          {payment.cancelReason ?? "Cancelado"}
                        </small>
                      ) : null}
                    </div>
                  </td>
                </tr>,
                actionRow(payment),
              ].filter(Boolean);
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
