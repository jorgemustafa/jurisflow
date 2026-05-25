import { Link } from "react-router";
import { labelDeadlineAlert, labelDeadlineStatus } from "src/features/deadlines/deadlineLabels.js";
import type { CaseDeadline, DeadlineStatus } from "src/services/deadlines.js";
import { formatDate } from "src/utils/format.js";

type DeadlineListProps = {
  deadlines: CaseDeadline[];
  onStatusChange?: (id: string, status: DeadlineStatus) => void;
  isUpdating?: boolean;
};

export const DeadlineList = ({ deadlines, onStatusChange, isUpdating }: DeadlineListProps) => {
  if (deadlines.length === 0) return <p className="empty">Nenhum prazo encontrado.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Prazo</th>
            <th>Processo</th>
            <th>Cliente</th>
            <th>Vencimento</th>
            <th>Alerta</th>
            <th>Status</th>
            {onStatusChange ? <th>Ação</th> : null}
          </tr>
        </thead>
        <tbody>
          {deadlines.map((deadline) => (
            <tr key={deadline.id}>
              <td>{deadline.title}</td>
              <td>
                <Link className="table-link" to={`/cases/${deadline.caseId}`}>
                  {deadline.caseTitle ?? deadline.caseId}
                </Link>
              </td>
              <td>{deadline.clientName ?? "Não informado"}</td>
              <td>{formatDate(deadline.dueAt)}</td>
              <td>
                <span className={`badge ${deadline.alertLevel}`}>{labelDeadlineAlert(deadline.alertLevel)}</span>
              </td>
              <td>{labelDeadlineStatus(deadline.status)}</td>
              {onStatusChange ? (
                <td>
                  {deadline.status === "pending" ? (
                    <button className="button" disabled={isUpdating} onClick={() => onStatusChange(deadline.id, "done")}>
                      Concluir
                    </button>
                  ) : (
                    labelDeadlineStatus(deadline.status)
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
