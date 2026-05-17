import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { markPaymentPaid, listPayments, type PaymentMethod, type PaymentStatus } from "src/services/finance.js";
import { ApiError } from "src/services/http.js";
import { formatDate, formatMoney } from "src/utils/format.js";
import { currentMonth } from "src/features/finance/utils/currentMonth.js";

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

const isOverdue = (dueDate: string, status: PaymentStatus) => status === "pending" && dueDate.slice(0, 10) < today();

export const FinancePage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<PaymentStatus | "all">("pending");
  const [paidAt, setPaidAt] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const payments = useQuery({
    queryKey: ["payments", { month, status }],
    queryFn: () => listPayments({ month, status })
  });
  const paidMutation = useMutation({
    mutationFn: (id: string) => markPaymentPaid(id, { paidAt, paymentMethod }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["finance-dashboard"] });
    },
    onError: (failure) => {
      setError(failure instanceof ApiError ? failure.message : "Não foi possível marcar o pagamento como recebido.");
    }
  });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Financeiro</span>
          <h1>Pagamentos</h1>
        </div>
        <div className="actions">
          <input className="month-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          <select value={status} onChange={(event) => setStatus(event.target.value as PaymentStatus | "all")}>
            <option value="pending">Pendentes</option>
            <option value="paid">Recebidos</option>
            <option value="canceled">Cancelados</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </header>

      <section className="toolbar">
        <input type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
          {Object.entries(methodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </section>

      {error ? <p className="alert">{error}</p> : null}
      {payments.isLoading ? <p>Carregando pagamentos...</p> : null}
      {payments.isError ? <p className="alert">Não foi possível carregar os pagamentos.</p> : null}

      {payments.data?.length === 0 ? (
        <p className="empty">Nenhum pagamento encontrado para o mês selecionado.</p>
      ) : payments.data ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Processo</th>
                <th>Descrição</th>
                <th>Parcela</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Recebimento</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {payments.data.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.clientName ?? payment.clientId}</td>
                  <td>{payment.caseTitle ?? "Não vinculado"}</td>
                  <td>{payment.description}</td>
                  <td>
                    {payment.installmentNumber}/{payment.installmentTotal}
                  </td>
                  <td>{formatMoney(payment.amountCents)}</td>
                  <td>{formatDate(payment.dueDate)}</td>
                  <td>
                    <span className={`badge ${payment.status}`}>
                      {isOverdue(payment.dueDate, payment.status) ? "Atrasado" : statusLabels[payment.status]}
                    </span>
                  </td>
                  <td>{payment.paidAt ? formatDate(payment.paidAt) : "Não recebido"}</td>
                  <td>
                    {payment.status === "pending" ? (
                      <button className="button" disabled={paidMutation.isPending} onClick={() => paidMutation.mutate(payment.id)}>
                        Receber
                      </button>
                    ) : (
                      statusLabels[payment.status]
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
};
