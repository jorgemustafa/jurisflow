import { Link } from "react-router";
import type { LegalCase } from "src/services/cases.js";
import { formatDate } from "src/utils/format.js";
import { labelCaseStatus, labelCaseType, labelLegalArea } from "src/features/cases/utils/caseLabels.js";

export const ClientCasesList = ({ cases }: { cases: LegalCase[] }) => {
  return (
    <section className="panel">
      {cases.length === 0 ? (
        <p className="empty-inline">Nenhum processo vinculado a este cliente.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Área</th>
                <th>Status</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link className="table-link" to={`/cases/${item.id}`}>
                      {item.title}
                    </Link>
                  </td>
                  <td>{labelCaseType(item.caseType)}</td>
                  <td>{labelLegalArea(item.legalArea)}</td>
                  <td>
                    <span className={`badge ${item.status}`}>{labelCaseStatus(item.status)}</span>
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
