import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { confirmCaseImport, previewCaseImport, type CaseImportDraft } from "src/services/cases.js";
import { listClients } from "src/services/clients.js";
import { ApiError } from "src/services/http.js";
import { fieldValue, formatDate } from "src/utils/format.js";

const courts = [
  ["tjsp", "TJSP"],
  ["tjrj", "TJRJ"],
  ["tjmg", "TJMG"],
  ["tjrs", "TJRS"],
  ["tjpr", "TJPR"],
  ["tjsc", "TJSC"],
  ["trf1", "TRF1"],
  ["trf2", "TRF2"],
  ["trf3", "TRF3"],
  ["trf4", "TRF4"],
  ["trf5", "TRF5"],
  ["trf6", "TRF6"],
  ["trt1", "TRT1"],
  ["trt2", "TRT2"],
  ["trt3", "TRT3"],
  ["trt4", "TRT4"],
  ["trt5", "TRT5"],
  ["trt6", "TRT6"],
  ["trt7", "TRT7"],
  ["trt8", "TRT8"],
  ["trt9", "TRT9"],
  ["trt10", "TRT10"],
  ["trt11", "TRT11"],
  ["trt12", "TRT12"],
  ["trt13", "TRT13"],
  ["trt14", "TRT14"],
  ["trt15", "TRT15"],
  ["trt16", "TRT16"],
  ["trt17", "TRT17"],
  ["trt18", "TRT18"],
  ["trt19", "TRT19"],
  ["trt20", "TRT20"],
  ["trt21", "TRT21"],
  ["trt22", "TRT22"],
  ["trt23", "TRT23"],
  ["trt24", "TRT24"]
];

const emptyForm = { cnjNumber: "", courtCode: "tjsp", clientId: "" };

function DraftDetails({ draft }: { draft: CaseImportDraft }) {
  const visibleMovements = draft.movements.slice(0, 8);

  return (
    <section className="panel import-preview">
      <div>
        <span>Prévia DataJud</span>
        <h2>{draft.title}</h2>
      </div>
      <div className="details-grid">
        <div>
          <span>CNJ</span>
          <strong>{draft.cnjNumber}</strong>
        </div>
        <div>
          <span>Tribunal</span>
          <strong>{fieldValue(draft.court)}</strong>
        </div>
        <div>
          <span>Vara/órgão</span>
          <strong>{fieldValue(draft.division)}</strong>
        </div>
        <div>
          <span>Ajuizamento</span>
          <strong>{draft.openedAt ? formatDate(draft.openedAt) : "Não informado"}</strong>
        </div>
      </div>
      {draft.description ? <p>{draft.description}</p> : null}
      <h3>Andamentos a importar: {draft.movements.length}</h3>
      {visibleMovements.length ? (
        <div className="timeline-list">
          {visibleMovements.map((movement) => (
            <article className="timeline-item" key={movement.sourceHash}>
              <div>
                <strong>{movement.title}</strong>
                {movement.description ? <p>{movement.description}</p> : null}
                <small>DataJud</small>
              </div>
              <time>{formatDate(movement.occurredAt)}</time>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum andamento retornado pelo DataJud.</p>
      )}
    </section>
  );
}

export const ImportCasePage = () => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clients = useQuery({ queryKey: ["clients", "case-import"], queryFn: () => listClients({ q: "", status: "active", type: "all" }) });
  const previewMutation = useMutation({
    mutationFn: () => previewCaseImport({ cnjNumber: form.cnjNumber, courtCode: form.courtCode }),
    onSuccess: () => setError(""),
    onError: (failure) => setError(failure instanceof ApiError ? failure.message : "Não foi possível consultar o DataJud.")
  });
  const importMutation = useMutation({
    mutationFn: () => confirmCaseImport(form),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
      navigate(`/cases/${result.case.id}`);
    },
    onError: (failure) => setError(failure instanceof ApiError ? failure.message : "Não foi possível importar o processo.")
  });

  const submitPreview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    previewMutation.mutate();
  };

  const preview = previewMutation.data;
  const canImport = Boolean(preview?.draft && form.clientId);

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Processos</span>
          <h1>Importar processo</h1>
          <p>Consulta gratuita via DataJud por CNJ e tribunal. O cliente deve ser associado manualmente antes de salvar.</p>
        </div>
        <Link className="button" to="/cases">
          Voltar
        </Link>
      </header>

      <section className="panel">
        <form className="case-import-form" onSubmit={submitPreview}>
          <input
            placeholder="Número CNJ"
            value={form.cnjNumber}
            onChange={(event) => setForm((current) => ({ ...current, cnjNumber: event.target.value }))}
          />
          <select value={form.courtCode} onChange={(event) => setForm((current) => ({ ...current, courtCode: event.target.value }))}>
            {courts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="button primary" disabled={previewMutation.isPending}>
            <Search size={18} />
            Consultar
          </button>
        </form>
        {error ? <p className="alert">{error}</p> : null}
        {preview?.duplicate ? (
          <p className="alert">
            Este CNJ já está cadastrado no processo{" "}
            <Link className="table-link" to={`/cases/${preview.duplicate.id}`}>
              {preview.duplicate.title}
            </Link>
            .
          </p>
        ) : null}
      </section>

      {preview?.draft ? <DraftDetails draft={preview.draft} /> : null}

      {preview?.draft ? (
        <section className="panel">
          <h2>Associar cliente</h2>
          <div className="case-import-confirm">
            <select value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}>
              <option value="">Selecione um cliente ativo</option>
              {clients.data?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <button className="button primary" type="button" disabled={!canImport || importMutation.isPending} onClick={() => importMutation.mutate()}>
              Importar processo e andamentos
            </button>
          </div>
          {clients.isError ? <p className="alert">Não foi possível carregar os clientes ativos.</p> : null}
        </section>
      ) : null}
    </>
  );
};
