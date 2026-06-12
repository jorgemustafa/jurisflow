import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  confirmCaseImportBatch,
  createCaseImportBatch,
  getCaseImportBatch,
  updateCaseImportItem,
  type CaseImportBatch,
  type CaseImportBatchItem,
  type CaseImportBatchResult,
  type CaseImportItemStatus
} from "src/services/cases.js";
import { listClients } from "src/services/clients.js";
import { ApiError } from "src/services/http.js";
import { fieldValue } from "src/utils/format.js";

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatCnj = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 20) return value;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
};

const parseInput = (value: string) => {
  const numbers = value
    .split(/[\n,;]+/)
    .map((entry) => onlyDigits(entry))
    .filter((entry) => entry.length > 0);
  return [...new Set(numbers)];
};

const statusLabels: Record<CaseImportItemStatus, string> = {
  pending: "Aguardando cliente",
  duplicate: "Já cadastrado",
  failed: "Falhou",
  imported: "Importado",
  discarded: "Descartado"
};

const statusBadges: Record<CaseImportItemStatus, string> = {
  pending: "due_soon",
  duplicate: "on_hold",
  failed: "overdue",
  imported: "active",
  discarded: "inactive"
};

export const ImportCasePage = () => {
  const [input, setInput] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<CaseImportBatchResult | null>(null);
  const queryClient = useQueryClient();

  const cnjNumbers = useMemo(() => parseInput(input), [input]);
  const invalidNumbers = cnjNumbers.filter((entry) => entry.length !== 20);

  const clients = useQuery({ queryKey: ["clients", "case-import"], queryFn: () => listClients({ q: "", status: "active", type: "all" }) });
  const batch = useQuery({
    queryKey: ["case-import-batch", batchId],
    queryFn: () => getCaseImportBatch(batchId as string),
    enabled: Boolean(batchId)
  });

  const setBatchData = (data: CaseImportBatch) => {
    queryClient.setQueryData(["case-import-batch", data.id], data);
  };

  const failureMessage = (failure: unknown, fallback: string) => (failure instanceof ApiError ? failure.message : fallback);

  const createMutation = useMutation({
    mutationFn: () => createCaseImportBatch(cnjNumbers),
    onSuccess: (data) => {
      setError("");
      setSummary(null);
      setBatchData(data);
      setBatchId(data.id);
    },
    onError: (failure) => setError(failureMessage(failure, "Não foi possível consultar o DataJud."))
  });

  const updateItemMutation = useMutation({
    mutationFn: (variables: { itemId: string; data: { clientId?: string | null; status?: "pending" | "discarded" } }) =>
      updateCaseImportItem(batchId as string, variables.itemId, variables.data),
    onSuccess: (data) => {
      setError("");
      setBatchData(data);
    },
    onError: (failure) => setError(failureMessage(failure, "Não foi possível atualizar o item."))
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmCaseImportBatch(batchId as string),
    onSuccess: async (result) => {
      setError("");
      setSummary(result);
      setBatchData(result.batch);
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: (failure) => setError(failureMessage(failure, "Não foi possível importar os processos."))
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cnjNumbers.length === 0 || invalidNumbers.length > 0) return;
    createMutation.mutate();
  };

  const items = batch.data?.items ?? [];
  const readyCount = items.filter((item) => item.status === "pending" && item.clientId).length;
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const isBusy = updateItemMutation.isPending || confirmMutation.isPending;

  const itemRow = (item: CaseImportBatchItem) => (
    <tr key={item.id}>
      <td>{formatCnj(item.cnjNumber)}</td>
      <td>
        {item.status === "failed" ? (
          <span className="empty-inline">{item.errorMessage ?? "Falha na consulta"}</span>
        ) : item.caseId ? (
          <Link className="table-link" to={`/cases/${item.caseId}`}>
            {item.draft?.title ?? "Ver processo"}
          </Link>
        ) : (
          fieldValue(item.draft?.title ?? null)
        )}
      </td>
      <td>{fieldValue(item.draft?.court ?? item.courtCode?.toUpperCase() ?? null)}</td>
      <td>{item.draft ? item.draft.movements.length : "—"}</td>
      <td>
        <span className={`badge ${statusBadges[item.status]}`}>{statusLabels[item.status]}</span>
      </td>
      <td>
        {item.status === "pending" ? (
          <select
            value={item.clientId ?? ""}
            disabled={isBusy || batch.data?.status !== "open"}
            onChange={(event) =>
              updateItemMutation.mutate({ itemId: item.id, data: { clientId: event.target.value === "" ? null : event.target.value } })
            }
          >
            <option value="">Selecione um cliente</option>
            {clients.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="empty-inline">—</span>
        )}
      </td>
      <td>
        {batch.data?.status === "open" && item.status === "pending" ? (
          <button
            className="button"
            type="button"
            title="Descartar"
            disabled={isBusy}
            onClick={() => updateItemMutation.mutate({ itemId: item.id, data: { status: "discarded" } })}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
        {batch.data?.status === "open" && item.status === "discarded" ? (
          <button
            className="button"
            type="button"
            title="Restaurar"
            disabled={isBusy}
            onClick={() => updateItemMutation.mutate({ itemId: item.id, data: { status: "pending" } })}
          >
            <RotateCcw size={16} />
          </button>
        ) : null}
      </td>
    </tr>
  );

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Processos</span>
          <h1>Importar processos</h1>
          <p>
            Cole os números CNJ (um por linha). O tribunal é identificado automaticamente pelo número e os
            clientes são vinculados na revisão antes de salvar.
          </p>
        </div>
        <Link className="button" to="/cases">
          Voltar
        </Link>
      </header>

      <section className="panel">
        <form className="case-import-batch-form" onSubmit={submit}>
          <textarea
            rows={6}
            placeholder={"0000001-23.2026.8.26.0000\n0000002-34.2025.5.02.0000"}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="case-import-batch-actions">
            <small>
              {cnjNumbers.length} número{cnjNumbers.length === 1 ? "" : "s"} detectado{cnjNumbers.length === 1 ? "" : "s"}
              {invalidNumbers.length > 0 ? ` · ${invalidNumbers.length} inválido(s): um CNJ tem 20 dígitos` : ""}
            </small>
            <button className="button primary" disabled={createMutation.isPending || cnjNumbers.length === 0 || invalidNumbers.length > 0}>
              <Search size={18} />
              {createMutation.isPending ? "Consultando DataJud..." : "Consultar processos"}
            </button>
          </div>
        </form>
        {error ? <p className="alert">{error}</p> : null}
      </section>

      {batch.data ? (
        <section className="panel">
          <h2>Revisão da importação</h2>
          {summary ? (
            <p className="alert success">
              {summary.imported} processo(s) importado(s) com {summary.importedMovements} andamento(s).
              {summary.duplicates > 0 ? ` ${summary.duplicates} já existia(m).` : ""}
            </p>
          ) : null}
          {items.length === 0 ? (
            <p className="empty">Nenhum processo na lista.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>CNJ</th>
                    <th>Processo</th>
                    <th>Tribunal</th>
                    <th>Andamentos</th>
                    <th>Status</th>
                    <th>Cliente</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>{items.map(itemRow)}</tbody>
              </table>
            </div>
          )}
          {clients.isError ? <p className="alert">Não foi possível carregar os clientes ativos.</p> : null}
          {batch.data.status === "open" && pendingCount > 0 ? (
            <div className="case-import-batch-actions">
              <small>
                {readyCount} de {pendingCount} pendente(s) com cliente vinculado
              </small>
              <button className="button primary" type="button" disabled={readyCount === 0 || isBusy} onClick={() => confirmMutation.mutate()}>
                {confirmMutation.isPending ? "Importando..." : `Importar ${readyCount} processo(s)`}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
};
