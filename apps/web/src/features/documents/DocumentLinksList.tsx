import { Link } from "react-router";
import type { LegalDocument } from "src/services/documents.js";
import { openDocument } from "src/services/documents.js";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { ApiError } from "src/services/http.js";
import { formatDate } from "src/utils/format.js";

export const DocumentLinksList = ({ documents }: { documents: LegalDocument[] }) => {
  const [error, setError] = useState("");
  if (documents.length === 0) return <p className="empty">Nenhum documento vinculado.</p>;

  const open = async (document: LegalDocument, download = false) => {
    try {
      setError("");
      await openDocument(document, download);
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Não foi possível abrir o documento.");
    }
  };

  return (
    <><div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Processo</th>
            <th>Tipo</th>
            <th>Atualizado</th>
            <th>Ações</th>
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
              <td className="table-actions">
                <div className="table-action-group">
                  {(document.mimeType === "application/pdf" || document.mimeType.startsWith("image/")) ? <button className="icon-button" title="Visualizar" onClick={() => void open(document)}><Eye size={17} /></button> : null}
                  <button className="icon-button" title="Baixar" onClick={() => void open(document, true)}><Download size={17} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>{error ? <p className="alert">{error}</p> : null}</>
  );
};
