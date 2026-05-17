import type { LegalCase } from "src/services/cases.js";
import { fieldValue, formatDate } from "src/utils/format.js";
import { labelCaseStage, labelCaseStatus, labelCaseType, labelLegalArea } from "src/features/cases/utils/caseLabels.js";

export const CasesTable = ({ cases }: { cases: LegalCase[] }) => {
  if (cases.length === 0) return <p className="empty">Nenhum processo encontrado.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Tipo</th>
            <th>CNJ</th>
            <th>Área</th>
            <th>Fase</th>
            <th>Status</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
              </td>
              <td>{labelCaseType(item.caseType)}</td>
              <td>{fieldValue(item.cnjNumber)}</td>
              <td>{labelLegalArea(item.legalArea)}</td>
              <td>{labelCaseStage(item.stage)}</td>
              <td>
                <span className={`badge ${item.status}`}>{labelCaseStatus(item.status)}</span>
              </td>
              <td>{formatDate(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
