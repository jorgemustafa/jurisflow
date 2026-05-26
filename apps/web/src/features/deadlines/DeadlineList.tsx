import { Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { labelDeadlineAlert, labelDeadlineStatus } from "src/features/deadlines/deadlineLabels.js";
import type { CaseDeadline, DeadlineFormData, DeadlineStatus } from "src/services/deadlines.js";
import { formatDate } from "src/utils/format.js";

type DeadlineListProps = {
  deadlines: CaseDeadline[];
  onStatusChange?: (id: string, status: DeadlineStatus) => Promise<void> | void;
  onUpdate?: (id: string, data: DeadlineFormData) => Promise<void>;
  isUpdating?: boolean;
};

const toDateInput = (value: string) => new Date(value).toISOString().slice(0, 10);

export const DeadlineList = ({ deadlines, onStatusChange, onUpdate, isUpdating }: DeadlineListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeadlineFormData>({ title: "", description: "", dueAt: "" });
  const [draftStatus, setDraftStatus] = useState<DeadlineStatus>("pending");
  const hasActions = Boolean(onStatusChange || onUpdate);

  if (deadlines.length === 0) return <p className="empty">Nenhum prazo encontrado.</p>;

  const startEdit = (deadline: CaseDeadline) => {
    setEditingId(deadline.id);
    setDraft({ title: deadline.title, description: deadline.description ?? "", dueAt: toDateInput(deadline.dueAt) });
    setDraftStatus(deadline.status);
  };

  const saveEdit = async (deadline: CaseDeadline) => {
    if (!onUpdate) return;
    try {
      await onUpdate(deadline.id, draft);
      if (draftStatus !== deadline.status) await onStatusChange?.(deadline.id, draftStatus);
      setEditingId(null);
    } catch {
      // The page mutation renders the API error and keeps the row editable.
    }
  };

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
            {hasActions ? <th>Ação</th> : null}
          </tr>
        </thead>
        <tbody>
          {deadlines.map((deadline) => (
            <tr key={deadline.id}>
              <td className="deadline-title-cell">
                {editingId === deadline.id ? (
                  <div className="deadline-edit-fields">
                    <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                    <textarea rows={2} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
                  </div>
                ) : (
                  <>
                    <strong>{deadline.title}</strong>
                    {deadline.description ? <small>{deadline.description}</small> : null}
                  </>
                )}
              </td>
              <td>
                <Link className="table-link" to={`/cases/${deadline.caseId}`}>
                  {deadline.caseTitle ?? deadline.caseId}
                </Link>
              </td>
              <td>{deadline.clientName ?? "Não informado"}</td>
              <td>
                {editingId === deadline.id ? (
                  <input type="date" value={draft.dueAt} onChange={(event) => setDraft((current) => ({ ...current, dueAt: event.target.value }))} />
                ) : (
                  formatDate(deadline.dueAt)
                )}
              </td>
              <td>
                <span className={`badge ${deadline.alertLevel}`}>{labelDeadlineAlert(deadline.alertLevel)}</span>
              </td>
              <td>
                {editingId === deadline.id ? (
                  <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value as DeadlineStatus)}>
                    <option value="pending">Pendente</option>
                    <option value="done">Concluído</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                ) : (
                  labelDeadlineStatus(deadline.status)
                )}
              </td>
              {hasActions ? (
                <td className="table-actions">
                  <div className="table-action-group">
                    {editingId === deadline.id ? (
                      <>
                        <button className="button primary" disabled={isUpdating} onClick={() => void saveEdit(deadline)}>
                          <Save size={14} />
                          Salvar
                        </button>
                        <button className="button" disabled={isUpdating} onClick={() => setEditingId(null)}>
                          <X size={14} />
                          Cancelar
                        </button>
                      </>
                        ) : (
                      <>
                        {onUpdate ? (
                          <button className="button" disabled={isUpdating} onClick={() => startEdit(deadline)}>
                            <Pencil size={14} />
                            Editar
                          </button>
                        ) : null}
                        {deadline.status === "pending" ? (
                          <button className="button" disabled={isUpdating || !onStatusChange} onClick={() => onStatusChange?.(deadline.id, "done")}>
                            Concluir
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
