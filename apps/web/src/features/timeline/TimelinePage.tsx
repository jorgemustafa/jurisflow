import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { labelTimelineType } from "src/features/cases/utils/caseLabels.js";
import { listTimeline, type CaseTimelineEventType, type TimelineFilters } from "src/services/cases.js";
import { fieldValue, formatDate } from "src/utils/format.js";
import { useState } from "react";

const eventTypes: Array<CaseTimelineEventType | "all"> = ["all", "note", "hearing", "petition", "decision", "status_change", "other"];
const eventTypeLabel = (type: CaseTimelineEventType | "all") => (type === "all" ? "Todos os tipos" : labelTimelineType(type));

const defaultFilters: TimelineFilters = {
  q: "",
  type: "all"
};

export const TimelinePage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const timeline = useQuery({
    queryKey: ["timeline", filters],
    queryFn: () => listTimeline(filters)
  });

  return (
    <>
      <header className="page-header">
        <span>Andamentos</span>
        <h1>Linha do tempo</h1>
        <p>Acompanhe os últimos registros dos processos em um só lugar.</p>
      </header>

      <section className="toolbar timeline-toolbar">
        <input
          placeholder="Buscar por andamento, processo ou cliente"
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
        />
        <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as TimelineFilters["type"] }))}>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {eventTypeLabel(type)}
            </option>
          ))}
        </select>
      </section>

      {timeline.isLoading ? <p>Carregando andamentos...</p> : null}
      {timeline.isError ? <p className="alert">Não foi possível carregar os andamentos.</p> : null}
      {timeline.data?.length === 0 ? <p className="empty">Nenhum andamento encontrado.</p> : null}
      {timeline.data?.length ? (
        <div className="timeline-list">
          {timeline.data.map((event) => (
            <article className="timeline-item timeline-item-wide" key={event.id}>
              <div>
                <span>{labelTimelineType(event.type)}</span>
                <strong>{event.title}</strong>
                <p>{fieldValue(event.description)}</p>
                <small>
                  {event.clientName ?? "Cliente não informado"} · {event.createdByUserName ?? "Usuário não informado"}
                </small>
              </div>
              <div className="timeline-side">
                <time>{formatDate(event.occurredAt)}</time>
                <Link className="table-link" to={`/cases/${event.caseId}`}>
                  {event.caseTitle ?? "Ver processo"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
};
