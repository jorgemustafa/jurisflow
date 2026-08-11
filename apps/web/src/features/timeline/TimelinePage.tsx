import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { labelTimelineType } from "src/features/cases/utils/caseLabels.js";
import {
  listTimeline,
  type CaseTimelineEventType,
  type TimelineFilters,
} from "src/services/cases.js";
import { fieldValue, formatDate } from "src/utils/format.js";
import { useState } from "react";
import { LoadingState } from "src/components/ui/LoadingState.js";

const eventTypes: Array<CaseTimelineEventType | "all"> = [
  "all",
  "note",
  "hearing",
  "petition",
  "decision",
  "status_change",
  "other",
];
const eventTypeLabel = (type: CaseTimelineEventType | "all") =>
  type === "all" ? "Todos os tipos" : labelTimelineType(type);

const defaultFilters: TimelineFilters = {
  q: "",
  cnjNumber: "",
  type: "all",
};

export const TimelinePage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const timeline = useQuery({
    queryKey: ["timeline", filters],
    queryFn: () => listTimeline(filters),
  });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Andamentos</span>
          <h1>Linha do tempo</h1>
          <p>Acompanhe os últimos registros dos processos em um só lugar.</p>
        </div>
      </header>

      <section className="toolbar timeline-toolbar">
        <input
          placeholder="Buscar por andamento, processo ou cliente"
          value={filters.q}
          onChange={(event) =>
            setFilters((current) => ({ ...current, q: event.target.value }))
          }
        />
        <input
          placeholder="Filtrar por CNJ"
          value={filters.cnjNumber}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              cnjNumber: event.target.value,
            }))
          }
        />
        <select
          value={filters.type}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              type: event.target.value as TimelineFilters["type"],
            }))
          }
        >
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {eventTypeLabel(type)}
            </option>
          ))}
        </select>
      </section>

      {timeline.isLoading ? (
        <LoadingState label="Carregando andamentos" variant="list" />
      ) : null}
      {timeline.isError ? (
        <p className="alert">Não foi possível carregar os andamentos.</p>
      ) : null}
      {timeline.data?.length === 0 ? (
        <p className="empty">Nenhum andamento encontrado.</p>
      ) : null}
      {timeline.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Andamento</th>
                <th>Cliente</th>
                <th>Processo</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {timeline.data.map((event) => (
                <tr key={event.id}>
                  <td>{labelTimelineType(event.type)}</td>
                  <td className="table-text-cell">
                    <strong>{event.title}</strong>
                    <small>
                      {fieldValue(event.description)} ·{" "}
                      {event.externalSource === "datajud"
                        ? "DataJud"
                        : (event.createdByUserName ?? "Usuário não informado")}
                    </small>
                  </td>
                  <td>{event.clientName ?? "Não informado"}</td>
                  <td>
                    <Link className="table-link" to={`/cases/${event.caseId}`}>
                      {event.caseTitle ?? "Ver processo"}
                    </Link>
                  </td>
                  <td>{formatDate(event.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
};
