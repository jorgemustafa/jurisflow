import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { listCases } from "src/services/cases.js";
import { listClients } from "src/services/clients.js";
import { createDocument, listDocuments, type DocumentFilters, type DocumentFormData, type DocumentScope } from "src/services/documents.js";
import { ApiError } from "src/services/http.js";
import { formatDate } from "src/utils/format.js";
import { LoadingState } from "src/components/ui/LoadingState.js";
import { Tabs } from "src/components/ui/Tabs.js";

const emptyForm: DocumentFormData = {
  clientId: "",
  caseId: "",
  name: "",
  path: "",
  mimeType: "application/pdf"
};

export const DocumentsPage = () => {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [filters, setFilters] = useState<DocumentFilters>({ q: "", scope: "all" });
  const [form, setForm] = useState<DocumentFormData>(emptyForm);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const documents = useQuery({ queryKey: ["documents", filters], queryFn: () => listDocuments(filters) });
  const clients = useQuery({ queryKey: ["clients", "documents"], queryFn: () => listClients({ q: "", status: "all", type: "all" }) });
  const cases = useQuery({
    queryKey: ["cases", "documents"],
    queryFn: () => listCases({ q: "", status: "all", caseType: "all", stage: "all", legalArea: "all" })
  });
  const caseOptions = cases.data?.filter((item) => !form.clientId || item.clientId === form.clientId) ?? [];
  const createMutation = useMutation({
    mutationFn: (data: DocumentFormData) => createDocument(data),
    onSuccess: async () => {
      setForm(emptyForm);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (failure) => {
      setError(failure instanceof ApiError ? failure.message : "Não foi possível cadastrar o documento.");
    }
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Documentos</span>
          <h1>Gestão de documentos</h1>
        </div>
      </header>

      <Tabs
        ariaLabel="Seções de documentos"
        tabs={[{ value: "list", label: "Documentos" }, { value: "create", label: "Novo documento" }]}
        value={tab}
        onChange={setTab}
      />

      {tab === "create" ? <section className="panel">
        <h2>Novo documento</h2>
        <form className="document-form" onSubmit={submit}>
          <select
            value={form.clientId}
            onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value, caseId: "" }))}
            disabled={clients.isLoading}
          >
            <option value="">Selecione o cliente</option>
            {clients.data?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select value={form.caseId} onChange={(event) => setForm((current) => ({ ...current, caseId: event.target.value }))}>
            <option value="">Sem processo vinculado</option>
            {caseOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <input placeholder="Nome do documento" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <input placeholder="Caminho ou chave de armazenamento" value={form.path} onChange={(event) => setForm((current) => ({ ...current, path: event.target.value }))} />
          <input placeholder="MIME type" value={form.mimeType} onChange={(event) => setForm((current) => ({ ...current, mimeType: event.target.value }))} />
          <button className="button primary" disabled={createMutation.isPending}>
            <Upload size={18} />
            Cadastrar
          </button>
        </form>
        {error ? <p className="alert">{error}</p> : null}
      </section> : null}

      {tab === "list" ? <><section className="toolbar documents-toolbar">
        <input
          placeholder="Buscar por nome, cliente ou processo"
          value={filters.q ?? ""}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
        />
        <select value={filters.scope ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value as DocumentScope }))}>
          <option value="all">Todos</option>
          <option value="client">Clientes</option>
          <option value="case">Processos</option>
        </select>
      </section>

      {documents.isLoading ? <LoadingState label="Carregando documentos" variant="table" columns={5} /> : null}
      {documents.isError ? <p className="alert">Não foi possível carregar os documentos.</p> : null}
      {documents.data?.length === 0 ? (
        <p className="empty">Nenhum documento cadastrado.</p>
      ) : documents.data ? (
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
            <tbody>
              {documents.data.map((document) => (
                <tr key={document.id}>
                  <td>{document.name}</td>
                  <td>
                    <Link className="table-link" to={`/clients/${document.clientId}`}>
                      {document.clientName ?? document.clientId}
                    </Link>
                  </td>
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
      ) : null}</> : null}
    </>
  );
};
