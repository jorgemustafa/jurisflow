import { Link } from "react-router";
import type { LegalDocument } from "src/services/documents.js";
import { formatDate } from "src/utils/format.js";

export const DocumentLinksList = ({ documents }: { documents: LegalDocument[] }) => {
  if (documents.length === 0) return <p className="empty">Nenhum documento vinculado.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Processo</th>
            <th>Tipo</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>{document.name}</td>
              <td>
                {document.caseId ? (
                  <Link className="table-link" to={`/cases/${document.caseId}`}>
                    {document.caseTitle ?? document.caseId}
                  </Link>
                ) : (
                  "Sem processo"
                )}
              </td>
              <td>{document.mimeType}</td>
              <td>{formatDate(document.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
