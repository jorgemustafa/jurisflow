import type { FinancePaymentSummary } from "src/services/finance.js";
import { formatDate, formatMoney } from "src/utils/format.js";

type PaymentSummaryListProps = {
  title: string;
  payments: FinancePaymentSummary[];
  empty: string;
};

export const PaymentSummaryList = ({ title, payments, empty }: PaymentSummaryListProps) => {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {payments.length === 0 ? (
        <p className="empty-inline">{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Processo</th>
                <th>Parcela</th>
                <th>Valor</th>
                <th>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.clientName}</td>
                  <td>{payment.caseTitle ?? "Não vinculado"}</td>
                  <td>
                    {payment.installmentNumber}/{payment.installmentTotal}
                  </td>
                  <td>{formatMoney(payment.amountCents)}</td>
                  <td>{formatDate(payment.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
