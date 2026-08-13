import { useQuery } from "@tanstack/react-query";
import { PaymentsTable } from "src/features/finance/PaymentsTable.js";
import { listPayments } from "src/services/finance.js";
import { LoadingState } from "src/components/ui/LoadingState.js";
import { Tabs } from "src/components/ui/Tabs.js";
import {
  filterPaymentPlanByStatus,
  type PaymentPlanTab,
} from "src/features/finance/utils/paymentPlanStatus.js";
import { useState } from "react";

export const CasePaymentsPanel = ({ caseId }: { caseId: string }) => {
  const [tab, setTab] = useState<PaymentPlanTab>("pending");
  const payments = useQuery({
    queryKey: ["payments", { caseId, status: "all" }],
    queryFn: () => listPayments({ caseId, status: "all" }),
    enabled: Boolean(caseId),
  });
  const items = payments.data ?? [];
  const filteredPayments = filterPaymentPlanByStatus(items, tab);
  const count = (current: PaymentPlanTab) =>
    filterPaymentPlanByStatus(items, current).length;

  return (
    <div className="case-payments-panel">
      <Tabs
        ariaLabel="Status das parcelas"
        tabs={[
          { value: "pending", label: `A Receber (${count("pending")})` },
          { value: "paid", label: `Finalizados (${count("paid")})` },
          { value: "overdue", label: `Inadimplentes (${count("overdue")})` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {payments.isLoading ? (
        <LoadingState
          label="Carregando pagamentos"
          variant="table"
          columns={5}
        />
      ) : null}
      {payments.isError ? (
        <p className="alert">Não foi possível carregar os pagamentos.</p>
      ) : null}
      {payments.data ? (
        <PaymentsTable
          payments={filteredPayments}
          showClient={false}
          showCase={false}
          showInstallment={tab !== "paid"}
          showDueDate={tab !== "paid"}
          showReceived={false}
          empty="Nenhuma parcela nesta categoria."
        />
      ) : null}
    </div>
  );
};
