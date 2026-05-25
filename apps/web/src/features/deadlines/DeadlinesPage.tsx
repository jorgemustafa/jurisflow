import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DeadlineList } from "src/features/deadlines/DeadlineList.js";
import { listDeadlines, updateDeadlineStatus, type DeadlineFilters, type DeadlineStatus } from "src/services/deadlines.js";

const defaultFilters: DeadlineFilters = {
  q: "",
  status: "pending",
  alertWindowDays: "7"
};

export const DeadlinesPage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const queryClient = useQueryClient();
  const deadlines = useQuery({ queryKey: ["deadlines", filters], queryFn: () => listDeadlines(filters) });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeadlineStatus }) => updateDeadlineStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    }
  });

  return (
    <>
      <header className="page-header">
        <span>Prazos</span>
        <h1>Alertas de prazo</h1>
        <p>Acompanhe prazos pendentes, atrasados e próximos do vencimento.</p>
      </header>

      <section className="toolbar deadlines-toolbar">
        <input
          placeholder="Buscar por prazo, processo ou cliente"
          value={filters.q ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
        />
        <select value={filters.status ?? "pending"} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DeadlineStatus | "all" }))}>
          <option value="pending">Pendentes</option>
          <option value="done">Concluídos</option>
          <option value="canceled">Cancelados</option>
          <option value="all">Todos</option>
        </select>
        <input
          min="0"
          max="90"
          type="number"
          value={filters.alertWindowDays ?? "7"}
          onChange={(event) => setFilters((current) => ({ ...current, alertWindowDays: event.target.value }))}
        />
      </section>

      {deadlines.isLoading ? <p>Carregando prazos...</p> : null}
      {deadlines.isError ? <p className="alert">Não foi possível carregar os prazos.</p> : null}
      {deadlines.data ? (
        <DeadlineList
          deadlines={deadlines.data}
          isUpdating={statusMutation.isPending}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        />
      ) : null}
    </>
  );
};
