import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { createCaseTimelineEvent, getCase, listCaseTimeline, type CaseTimelineEventFormData, type CaseTimelineEventType } from "src/services/cases.js";
import { ApiError } from "src/services/http.js";
import { fieldValue, formatDate, formatMoney } from "src/utils/format.js";
import { labelCaseStage, labelCaseStatus, labelCaseType, labelLegalArea, labelTimelineType } from "src/features/cases/utils/caseLabels.js";
import { ClientDetailItem } from "src/features/clients/detail/ClientDetailItem.js";
import { DeadlineList } from "src/features/deadlines/DeadlineList.js";
import { DocumentLinksList } from "src/features/documents/DocumentLinksList.js";
import { listDocuments } from "src/services/documents.js";
import { createDeadline, listDeadlines, updateDeadline, updateDeadlineStatus, type DeadlineFormData, type DeadlineStatus } from "src/services/deadlines.js";

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
  const [timelineForm, setTimelineForm] = useState<CaseTimelineEventFormData>(emptyTimelineForm);
  const [deadlineForm, setDeadlineForm] = useState<DeadlineFormData>(emptyDeadlineForm);
  const [timelineError, setTimelineError] = useState("");
  const [deadlineError, setDeadlineError] = useState("");
  const queryClient = useQueryClient();
  const legalCase = useQuery({ queryKey: ["case", id], queryFn: () => getCase(id), enabled: Boolean(id) });
  const timeline = useQuery({ queryKey: ["case-timeline", id], queryFn: () => listCaseTimeline(id), enabled: Boolean(id) });
  const documents = useQuery({ queryKey: ["documents", "case", id], queryFn: () => listDocuments({ caseId: id }), enabled: Boolean(id) });
  const deadlines = useQuery({
    queryKey: ["deadlines", "case", id],
    queryFn: () => listDeadlines({ caseId: id, status: "all", alertWindowDays: "7" }),
    enabled: Boolean(id)
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

  if (legalCase.isLoading) return <p>Carregando processo...</p>;
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
          <Link className="button primary" to={`/clients/${item.clientId}`}>
            Ver cliente
          </Link>
          <Link className="button primary" to={`/cases/${item.id}/edit`}>
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </header>

      <section className="details-grid">
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
        <ClientDetailItem label="Cliente" value={item.clientId} />
        <ClientDetailItem label="Responsável" value={fieldValue(item.responsibleUserId)} />
        <ClientDetailItem label="Criado em" value={formatDate(item.createdAt)} />
        <ClientDetailItem label="Atualizado em" value={formatDate(item.updatedAt)} />
      </section>

      <section className="panel">
        <h2>Documentos</h2>
        {documents.isLoading ? <p>Carregando documentos do processo...</p> : null}
        {documents.isError ? <p className="alert">Não foi possível carregar os documentos do processo.</p> : null}
        {documents.data ? <DocumentLinksList documents={documents.data} /> : null}
      </section>

      <section className="panel timeline-panel">
        <h2>Prazos</h2>
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
        {deadlines.isLoading ? <p>Carregando prazos...</p> : null}
        {deadlines.isError ? <p className="alert">Não foi possível carregar os prazos do processo.</p> : null}
        {deadlines.data ? (
          <DeadlineList
            deadlines={deadlines.data}
            isUpdating={deadlineStatusMutation.isPending || updateDeadlineMutation.isPending}
            onUpdate={(deadlineId, data) => updateDeadlineMutation.mutateAsync({ deadlineId, data }).then(() => undefined)}
            onStatusChange={(deadlineId, status) => deadlineStatusMutation.mutateAsync({ deadlineId, status }).then(() => undefined)}
          />
        ) : null}
      </section>

      <section className="panel timeline-panel">
        <h2>Andamentos</h2>
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
        {timeline.isLoading ? <p>Carregando andamentos...</p> : null}
        {timeline.isError ? <p className="alert">Não foi possível carregar os andamentos.</p> : null}
        {timeline.data?.length === 0 ? <p className="empty">Nenhum andamento registrado.</p> : null}
        {timeline.data?.length ? (
          <div className="timeline-list">
            {timeline.data.map((event) => (
              <article className="timeline-item" key={event.id}>
                <div>
                  <span>{labelTimelineType(event.type)}</span>
                  <strong>{event.title}</strong>
                  {event.description ? <p>{event.description}</p> : null}
                  <small>{event.externalSource === "datajud" ? "DataJud" : event.createdByUserName ?? "Usuário não informado"}</small>
                </div>
                <time>{formatDate(event.occurredAt)}</time>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
};
