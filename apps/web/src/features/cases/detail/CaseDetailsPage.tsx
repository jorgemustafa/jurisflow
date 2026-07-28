import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  createCaseTimelineEvent,
  deleteCase,
  getCase,
  listCaseSyncRuns,
  listCaseTimeline,
  syncCase,
  type CaseTimelineEventFormData,
  type CaseTimelineEventType
} from "src/services/cases.js";
import { getClient } from "src/services/clients.js";
import { ApiError, backendErrorMessage } from "src/services/http.js";
import { fieldValue, formatDate, formatMoney } from "src/utils/format.js";
import { labelCaseStage, labelCaseStatus, labelCaseType, labelLegalArea, labelTimelineType } from "src/features/cases/utils/caseLabels.js";
import { labelSyncStatus, labelSyncTrigger, syncStatusBadgeClass } from "src/features/cases/utils/caseSyncLabels.js";
import { ClientDetailItem } from "src/features/clients/detail/ClientDetailItem.js";
import { DeadlineList } from "src/features/deadlines/DeadlineList.js";
import { CasePaymentsPanel } from "src/features/finance/CasePaymentsPanel.js";
import { DocumentLinksList } from "src/features/documents/DocumentLinksList.js";
import { listDocuments } from "src/services/documents.js";
import { createDeadline, listDeadlines, updateDeadline, updateDeadlineStatus, type DeadlineFormData, type DeadlineStatus } from "src/services/deadlines.js";
import { LoadingState } from "src/components/ui/LoadingState.js";
import { Tabs } from "src/components/ui/Tabs.js";
import { DeleteConfirmationDialog } from "src/components/DeleteConfirmationDialog.js";

const optionalDate = (value: string | null) => (value ? formatDate(value) : "Não informado");
const optionalMoney = (value: number | null) => (value === null ? "Não informado" : formatMoney(value));
const today = () => new Date().toISOString().slice(0, 10);

const timelineTypes: CaseTimelineEventType[] = ["note", "hearing", "petition", "decision", "status_change", "other"];

const emptyTimelineForm = (): CaseTimelineEventFormData => ({
  type: "note",
  title: "",
  description: "",
  occurredAt: today()
});

const emptyDeadlineForm = (): DeadlineFormData => ({
  title: "",
  description: "",
  dueAt: today()
});

export const CaseDetailsPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"details" | "payments" | "documents" | "deadlines" | "sync" | "timeline">("details");
  const [timelineForm, setTimelineForm] = useState<CaseTimelineEventFormData>(emptyTimelineForm);
  const [deadlineForm, setDeadlineForm] = useState<DeadlineFormData>(emptyDeadlineForm);
  const [timelineError, setTimelineError] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const queryClient = useQueryClient();
  const legalCase = useQuery({ queryKey: ["case", id], queryFn: () => getCase(id), enabled: Boolean(id) });
  const client = useQuery({ queryKey: ["client", legalCase.data?.clientId], queryFn: () => getClient(legalCase.data!.clientId), enabled: Boolean(legalCase.data?.clientId) });
  const timeline = useQuery({ queryKey: ["case-timeline", id], queryFn: () => listCaseTimeline(id), enabled: Boolean(id) });
  const syncRuns = useQuery({ queryKey: ["case-sync-runs", id], queryFn: () => listCaseSyncRuns(id), enabled: Boolean(id) });
  const documents = useQuery({ queryKey: ["documents", "case", id], queryFn: () => listDocuments({ caseId: id }), enabled: Boolean(id) });
  const deadlines = useQuery({
    queryKey: ["deadlines", "case", id],
    queryFn: () => listDeadlines({ caseId: id, status: "all", alertWindowDays: "7" }),
    enabled: Boolean(id)
  });
  const syncMutation = useMutation({
    mutationFn: () => syncCase(id),
    onSuccess: async (result) => {
      if (result.status === "failed") {
        setSyncFeedback({
          kind: "error",
          message: backendErrorMessage(
            result.errorMessage,
            "Não foi possível atualizar o processo.",
          ),
        });
      } else if (result.newMovements > 0) {
        const label = result.newMovements === 1 ? "1 novo andamento" : `${result.newMovements} novos andamentos`;
        setSyncFeedback({ kind: "success", message: `${label} importado(s) do DataJud.` });
      } else {
        setSyncFeedback({ kind: "success", message: "Processo já está atualizado. Nenhuma novidade no DataJud." });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["case-timeline", id] }),
        queryClient.invalidateQueries({ queryKey: ["case-sync-runs", id] }),
        queryClient.invalidateQueries({ queryKey: ["case", id] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
      ]);
    },
    onError: (failure) => {
      setSyncFeedback({ kind: "error", message: failure instanceof ApiError ? failure.message : "Não foi possível atualizar o processo." });
    }
  });
  const createTimelineMutation = useMutation({
    mutationFn: (data: CaseTimelineEventFormData) => createCaseTimelineEvent(id, data),
    onSuccess: async () => {
      setTimelineForm(emptyTimelineForm());
      setTimelineError("");
      await queryClient.invalidateQueries({ queryKey: ["case-timeline", id] });
    },
    onError: (failure) => {
      setTimelineError(failure instanceof ApiError ? failure.message : "Não foi possível registrar o andamento.");
    }
  });
  const createDeadlineMutation = useMutation({
    mutationFn: (data: DeadlineFormData) => createDeadline(id, data),
    onSuccess: async () => {
      setDeadlineForm(emptyDeadlineForm());
      setDeadlineError("");
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
    onError: (failure) => {
      setDeadlineError(failure instanceof ApiError ? failure.message : "Não foi possível cadastrar o prazo.");
    }
  });
  const deadlineStatusMutation = useMutation({
    mutationFn: ({ deadlineId, status }: { deadlineId: string; status: DeadlineStatus }) => updateDeadlineStatus(deadlineId, status),
    onSuccess: async () => {
      setDeadlineError("");
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
    onError: (failure) => {
      setDeadlineError(failure instanceof ApiError ? failure.message : "Não foi possível atualizar o prazo.");
    }
  });
  const updateDeadlineMutation = useMutation({
    mutationFn: ({ deadlineId, data }: { deadlineId: string; data: DeadlineFormData }) => updateDeadline(deadlineId, data),
    onSuccess: async () => {
      setDeadlineError("");
      await queryClient.invalidateQueries({ queryKey: ["deadlines"] });
    },
    onError: (failure) => {
      setDeadlineError(failure instanceof ApiError ? failure.message : "Não foi possível atualizar o prazo.");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cases"] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["deadlines"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
      ]);
      navigate("/cases");
    },
    onError: (failure) => {
      setDeleteError(failure instanceof ApiError ? failure.message : "Não foi possível excluir o processo.");
    }
  });

  if (legalCase.isLoading) return <LoadingState label="Carregando processo" />;
  if (legalCase.isError || !legalCase.data) return <p className="alert">Processo não encontrado.</p>;

  const item = legalCase.data;
  const submitTimeline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTimelineMutation.mutate(timelineForm);
  };
  const submitDeadline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createDeadlineMutation.mutate(deadlineForm);
  };

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>{labelCaseType(item.caseType)}</span>
          <h1>{item.title}</h1>
          <p>{fieldValue(item.description)}</p>
        </div>
        <div className="actions">
          <Link className="button" to="/cases">
            Voltar
          </Link>
          {item.cnjNumber ? (
            <button className="button" type="button" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              <RefreshCw size={18} className={syncMutation.isPending ? "spin" : undefined} />
              {syncMutation.isPending ? "Atualizando..." : "Atualizar processo"}
            </button>
          ) : null}
          <Link className="button primary" to={`/clients/${item.clientId}`}>
            Ver cliente
          </Link>
          <Link className="button primary" to={`/cases/${item.id}/edit`}>
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </header>

      {syncFeedback ? <p className={syncFeedback.kind === "success" ? "alert success" : "alert"}>{syncFeedback.message}</p> : null}

      <Tabs
        ariaLabel="Seções do processo"
        tabs={[
          { value: "details", label: "Dados" },
          { value: "payments", label: "Pagamentos" },
          { value: "documents", label: "Documentos" },
          { value: "deadlines", label: "Prazos" },
          { value: "sync", label: "Atualizações" },
          { value: "timeline", label: "Andamentos" }
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "details" ? <section className="details-grid">
        <ClientDetailItem label="Status" value={labelCaseStatus(item.status)} />
        <ClientDetailItem label="Tipo" value={labelCaseType(item.caseType)} />
        <ClientDetailItem label="CNJ" value={fieldValue(item.cnjNumber)} />
        <ClientDetailItem label="Área jurídica" value={labelLegalArea(item.legalArea)} />
        <ClientDetailItem label="Fase" value={labelCaseStage(item.stage)} />
        <ClientDetailItem label="Parte contrária" value={fieldValue(item.opposingParty)} />
        <ClientDetailItem label="Tribunal" value={fieldValue(item.court)} />
        <ClientDetailItem label="Comarca" value={fieldValue(item.jurisdiction)} />
        <ClientDetailItem label="Vara" value={fieldValue(item.division)} />
        <ClientDetailItem label="Honorários totais" value={optionalMoney(item.totalFeeAmountCents)} />
        <ClientDetailItem label="Abertura" value={optionalDate(item.openedAt)} />
        <ClientDetailItem label="Encerramento" value={optionalDate(item.closedAt)} />
        <ClientDetailItem label="Cliente" value={item.clientName ?? item.clientId} />
        <ClientDetailItem label="Responsável" value={fieldValue(item.responsibleUserName ?? item.responsibleUserId)} />
        <ClientDetailItem label="Criado em" value={formatDate(item.createdAt)} />
        <ClientDetailItem label="Atualizado em" value={formatDate(item.updatedAt)} />
      </section> : null}

      {tab === "payments" ? <section className="panel">
        <CasePaymentsPanel caseId={item.id} />
      </section> : null}

      {tab === "documents" ? <section className="panel">
        {documents.isLoading ? <LoadingState label="Carregando documentos do processo" variant="table" columns={4} /> : null}
        {documents.isError ? <p className="alert">Não foi possível carregar os documentos do processo.</p> : null}
        {documents.data ? <DocumentLinksList documents={documents.data} /> : null}
      </section> : null}

      {tab === "deadlines" ? <section className="panel timeline-panel">
        <form className="deadline-form" onSubmit={submitDeadline}>
          <input
            placeholder="Título do prazo"
            value={deadlineForm.title}
            onChange={(event) => setDeadlineForm((current) => ({ ...current, title: event.target.value }))}
          />
          <input type="date" value={deadlineForm.dueAt} onChange={(event) => setDeadlineForm((current) => ({ ...current, dueAt: event.target.value }))} />
          <textarea
            placeholder="Descrição"
            rows={3}
            value={deadlineForm.description}
            onChange={(event) => setDeadlineForm((current) => ({ ...current, description: event.target.value }))}
          />
          <button className="button primary" disabled={createDeadlineMutation.isPending}>
            <Plus size={18} />
            Cadastrar
          </button>
        </form>
        {deadlineError ? <p className="alert">{deadlineError}</p> : null}
        {deadlines.isLoading ? <LoadingState label="Carregando prazos" variant="table" columns={6} /> : null}
        {deadlines.isError ? <p className="alert">Não foi possível carregar os prazos do processo.</p> : null}
        {deadlines.data ? (
          <DeadlineList
            deadlines={deadlines.data}
            isUpdating={deadlineStatusMutation.isPending || updateDeadlineMutation.isPending}
            onUpdate={(deadlineId, data) => updateDeadlineMutation.mutateAsync({ deadlineId, data }).then(() => undefined)}
            onStatusChange={(deadlineId, status) => deadlineStatusMutation.mutateAsync({ deadlineId, status }).then(() => undefined)}
          />
        ) : null}
      </section> : null}

      {tab === "sync" ? <section className="panel timeline-panel">
        {syncRuns.isLoading ? <LoadingState label="Carregando histórico de atualizações" variant="table" columns={5} /> : null}
        {syncRuns.isError ? <p className="alert">Não foi possível carregar o histórico de atualizações.</p> : null}
        {syncRuns.data?.length === 0 ? <p className="empty">Nenhuma sincronização registrada ainda.</p> : null}
        {syncRuns.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Origem</th>
                  <th>Resultado</th>
                  <th>Novos andamentos</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.data.map((run) => (
                  <tr key={run.id}>
                    <td>{formatDate(run.startedAt)}</td>
                    <td>{labelSyncTrigger(run.trigger)}</td>
                    <td>
                      <span className={`badge ${syncStatusBadgeClass(run.status)}`}>{labelSyncStatus(run.status)}</span>
                    </td>
                    <td>{run.newMovements}</td>
                    <td>{run.status === "failed" ? backendErrorMessage(run.errorMessage, "Falha na sincronização") : run.triggeredByUserName ?? "Rotina automática"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section> : null}

      {tab === "timeline" ? <section className="panel timeline-panel">
        <form className="timeline-form" onSubmit={submitTimeline}>
          <select
            value={timelineForm.type}
            onChange={(event) => setTimelineForm((current) => ({ ...current, type: event.target.value as CaseTimelineEventType }))}
          >
            {timelineTypes.map((type) => (
              <option key={type} value={type}>
                {labelTimelineType(type)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={timelineForm.occurredAt}
            onChange={(event) => setTimelineForm((current) => ({ ...current, occurredAt: event.target.value }))}
          />
          <input
            placeholder="Título"
            value={timelineForm.title}
            onChange={(event) => setTimelineForm((current) => ({ ...current, title: event.target.value }))}
          />
          <textarea
            placeholder="Descrição"
            rows={3}
            value={timelineForm.description}
            onChange={(event) => setTimelineForm((current) => ({ ...current, description: event.target.value }))}
          />
          <button className="button primary" disabled={createTimelineMutation.isPending}>
            <Plus size={18} />
            Registrar
          </button>
        </form>
        {timelineError ? <p className="alert">{timelineError}</p> : null}
        {timeline.isLoading ? <LoadingState label="Carregando andamentos" variant="list" /> : null}
        {timeline.isError ? <p className="alert">Não foi possível carregar os andamentos.</p> : null}
        {timeline.data?.length === 0 ? <p className="empty">Nenhum andamento registrado.</p> : null}
        {timeline.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tipo</th><th>Andamento</th><th>Origem</th><th>Data</th></tr></thead>
              <tbody>
                {timeline.data.map((event) => (
                  <tr key={event.id}>
                    <td>{labelTimelineType(event.type)}</td>
                    <td className="table-text-cell"><strong>{event.title}</strong>{event.description ? <small>{event.description}</small> : null}</td>
                    <td>{event.externalSource === "datajud" ? "DataJud" : event.createdByUserName ?? "Usuário não informado"}</td>
                    <td>{formatDate(event.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section> : null}

      <div className="actions">
        <button className="button danger" type="button" onClick={() => { setDeleteError(""); setDeleteText(""); setDeleteOpen(true); }}>
          <Trash2 size={18} />
          Excluir processo
        </button>
      </div>

      {isDeleteOpen ? (
        <DeleteConfirmationDialog
          title="Excluir processo"
          confirmText="DELETAR"
          value={deleteText}
          error={deleteError}
          isDeleting={deleteMutation.isPending}
          onChange={setDeleteText}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
        >
          <p>Esta ação exclui permanentemente o processo e tudo que estiver vinculado a ele.</p>
          <p><strong>Processo:</strong> {item.title}</p>
          <p><strong>Cliente:</strong> {client.data?.name ?? item.clientId}</p>
          <p><strong>CNJ:</strong> {fieldValue(item.cnjNumber)}</p>
          <p><strong>Honorários:</strong> {formatMoney(item.totalFeeAmountCents)}</p>
          <p>Serão removidos pagamentos, documentos, prazos, andamentos, sincronizações e notificações do processo.</p>
        </DeleteConfirmationDialog>
      ) : null}
    </>
  );
};
