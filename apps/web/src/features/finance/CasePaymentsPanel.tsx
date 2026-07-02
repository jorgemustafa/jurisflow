import { useQuery } from "@tanstack/react-query";
import { PaymentsTable } from "src/features/finance/PaymentsTable.js";
import { listPayments } from "src/services/finance.js";
import { LoadingState } from "src/components/ui/LoadingState.js";

export const CasePaymentsPanel = ({
  caseId,
}: {
  caseId: string;
}) => {
  const payments = useQuery({
    queryKey: ["payments", { caseId, status: "all" }],
    queryFn: () => listPayments({ caseId, status: "all" }),
    enabled: Boolean(caseId),
  });

  return (
    <div className="case-payments-panel">
      {payments.isLoading ? <LoadingState label="Carregando pagamentos" variant="table" columns={5} /> : null}
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
