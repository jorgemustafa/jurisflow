import { Upload } from "lucide-react";
import { useState } from "react";

type DocumentFilter = {
  q: string;
  scope: string;
};

const emptyDocuments: never[] = [];

export const DocumentsPage = () => {
  const [filters, setFilters] = useState<DocumentFilter>({ q: "", scope: "all" });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Documentos</span>
          <h1>Gestão de documentos</h1>
        </div>
        <button className="button primary" type="button" disabled>
          <Upload size={18} />
          Novo documento
        </button>
      </header>

      <section className="toolbar documents-toolbar">
        <input
          placeholder="Buscar por nome, cliente ou processo"
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
        />
        <select value={filters.scope} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value }))}>
          <option value="all">Todos</option>
          <option value="client">Clientes</option>
          <option value="case">Processos</option>
        </select>
      </section>

      {emptyDocuments.length === 0 ? (
        <p className="empty">Nenhum documento cadastrado.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cliente</th>
                <th>Processo</th>
                <th>Tipo</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
      )}
    </>
  );
};
