import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { createCaseTimelineEvent, getCase, listCaseTimeline, type CaseTimelineEventFormData, type CaseTimelineEventType } from "src/services/cases.js";
import { ApiError } from "src/services/http.js";
import { fieldValue, formatDate, formatMoney } from "src/utils/format.js";
import { labelCaseStage, labelCaseStatus, labelCaseType, labelLegalArea, labelTimelineType } from "src/features/cases/utils/caseLabels.js";
import { ClientDetailItem } from "src/features/clients/detail/ClientDetailItem.js";
import { DocumentLinksList } from "src/features/documents/DocumentLinksList.js";
import { listDocuments } from "src/services/documents.js";

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

export const CaseDetailsPage = () => {
  const { id = "" } = useParams();
  const [timelineForm, setTimelineForm] = useState<CaseTimelineEventFormData>(emptyTimelineForm);
  const [timelineError, setTimelineError] = useState("");
  const queryClient = useQueryClient();
  const legalCase = useQuery({ queryKey: ["case", id], queryFn: () => getCase(id), enabled: Boolean(id) });
  const timeline = useQuery({ queryKey: ["case-timeline", id], queryFn: () => listCaseTimeline(id), enabled: Boolean(id) });
  const documents = useQuery({ queryKey: ["documents", "case", id], queryFn: () => listDocuments({ caseId: id }), enabled: Boolean(id) });
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

  if (legalCase.isLoading) return <p>Carregando processo...</p>;
  if (legalCase.isError || !legalCase.data) return <p className="alert">Processo não encontrado.</p>;

  const item = legalCase.data;
  const submitTimeline = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTimelineMutation.mutate(timelineForm);
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
                  <small>{event.createdByUserName ?? "Usuário não informado"}</small>
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
