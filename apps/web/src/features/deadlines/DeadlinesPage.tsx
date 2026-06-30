import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DeadlineList } from "src/features/deadlines/DeadlineList.js";
import { listDeadlines, updateDeadline, updateDeadlineStatus, type DeadlineFilters, type DeadlineFormData, type DeadlineStatus } from "src/services/deadlines.js";
import { ApiError } from "src/services/http.js";
import { LoadingState } from "src/components/ui/LoadingState.js";

const defaultFilters: DeadlineFilters = {
  q: "",
  status: "pending",
  alertWindowDays: "7"
};

export const DeadlinesPage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [deadlineError, setDeadlineError] = useState("");
  const queryClient = useQueryClient();
  const deadlines = useQuery({ queryKey: ["deadlines", filters], queryFn: () => listDeadlines(filters) });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeadlineFormData }) => updateDeadline(id, data),
    onSuccess: async () => {
      setDeadlineError("");
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
    onError: (failure) => {
      setDeadlineError(failure instanceof ApiError ? failure.message : "Não foi possível atualizar o prazo.");
    }
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DeadlineStatus }) => updateDeadlineStatus(id, status),
    onSuccess: async () => {
      setDeadlineError("");
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
    onError: (failure) => {
      setDeadlineError(failure instanceof ApiError ? failure.message : "Não foi possível atualizar o prazo.");
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

      {deadlines.isLoading ? <LoadingState label="Carregando prazos" variant="table" columns={6} /> : null}
      {deadlines.isError ? <p className="alert">Não foi possível carregar os prazos.</p> : null}
      {deadlineError ? <p className="alert">{deadlineError}</p> : null}
      {deadlines.data ? (
        <DeadlineList
          deadlines={deadlines.data}
          isUpdating={statusMutation.isPending || updateMutation.isPending}
          onUpdate={(id, data) => updateMutation.mutateAsync({ id, data }).then(() => undefined)}
          onStatusChange={(id, status) => statusMutation.mutateAsync({ id, status }).then(() => undefined)}
        />
      ) : null}
    </>
  );
};
