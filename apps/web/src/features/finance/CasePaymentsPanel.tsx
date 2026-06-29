import { useQuery } from "@tanstack/react-query";
import { PaymentsTable } from "src/features/finance/PaymentsTable.js";
import { listPayments } from "src/services/finance.js";

export const CasePaymentsPanel = ({
  caseId,
  title = true,
}: {
  caseId: string;
  title?: boolean;
}) => {
  const payments = useQuery({
    queryKey: ["payments", { caseId, status: "all" }],
    queryFn: () => listPayments({ caseId, status: "all" }),
    enabled: Boolean(caseId),
  });

  return (
    <div className="case-payments-panel">
      {title ? <h2>Pagamentos</h2> : null}
      {payments.isLoading ? <p>Carregando pagamentos...</p> : null}
      {payments.isError ? (
        <p className="alert">Não foi possível carregar os pagamentos.</p>
      ) : null}
      {payments.data ? (
        <PaymentsTable
          payments={payments.data}
          showClient={false}
          showCase={false}
          empty="Nenhum pagamento vinculado ao processo."
        />
      ) : null}
    </div>
  );
};
