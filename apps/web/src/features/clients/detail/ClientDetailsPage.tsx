import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { listCases } from "src/services/cases.js";
import { ClientStatus, deleteClient, getClient, updateClientStatus } from "src/services/clients.js";
import { ApiError } from "src/services/http.js";
import { fieldValue, formatDate } from "src/utils/format.js";
import { ClientCasesList } from "src/features/clients/detail/ClientCasesList.js";
import { ClientDetailItem } from "src/features/clients/detail/ClientDetailItem.js";
import { labelClientStatus, labelClientType } from "src/features/clients/utils/clientLabels.js";
import { DocumentLinksList } from "src/features/documents/DocumentLinksList.js";
import { listDocuments } from "src/services/documents.js";
import { useState } from "react";
import { LoadingState } from "src/components/ui/LoadingState.js";
import { Tabs } from "src/components/ui/Tabs.js";
import { DeleteConfirmationDialog } from "src/components/DeleteConfirmationDialog.js";

export const ClientDetailsPage = () => {
  const [tab, setTab] = useState<"details" | "cases" | "documents">("details");
  const [deleteText, setDeleteText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id), enabled: Boolean(id) });
  const cases = useQuery({
    queryKey: ["cases", "client", id],
    queryFn: () => listCases({ q: "", status: "all", caseType: "all", stage: "all", legalArea: "all", clientId: id }),
    enabled: Boolean(id)
  });
  const documents = useQuery({
    queryKey: ["documents", "client", id],
    queryFn: () => listDocuments({ clientId: id }),
    enabled: Boolean(id)
  });
  const statusMutation = useMutation({
    mutationFn: (status: ClientStatus) => updateClientStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["client", id], updated);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      navigate("/clients");
    },
    onError: (failure) => {
      setDeleteError(failure instanceof ApiError ? failure.message : "Não foi possível excluir o cliente.");
    }
  });

  if (client.isLoading) return <LoadingState label="Carregando cliente" />;
  if (client.isError || !client.data) return <p className="alert">Cliente não encontrado.</p>;

  const nextStatus = client.data.status === "active" ? "inactive" : "active";

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>{labelClientType(client.data.type)}</span>
          <h1>{client.data.name}</h1>
        </div>
        <div className="actions">
          <button className="button" onClick={() => statusMutation.mutate(nextStatus)} disabled={statusMutation.isPending}>
            {client.data.status === "active" ? "Inativar" : "Reativar"}
          </button>
          <Link className="button" to={`/cases/import?clientId=${client.data.id}`}>
          <button className="button danger" type="button" onClick={() => { setDeleteError(""); setDeleteText(""); setDeleteOpen(true); }}>
            <Trash2 size={18} />
            Excluir
          </button>
          <Link className="button" to={`/clients/${client.data.id}/cases/new`}>
            <FolderPlus size={18} />
            Novo processo
          </Link>
          <Link className="button primary" to={`/clients/${client.data.id}/edit`}>
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </header>

      <Tabs
        ariaLabel="Seções do cliente"
        tabs={[
          { value: "details", label: "Dados" },
          { value: "cases", label: "Processos" },
          { value: "documents", label: "Documentos" }
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "details" ? <section className="details-grid">
        <ClientDetailItem label="Status" value={labelClientStatus(client.data.status)} />
        <ClientDetailItem label="CPF/CNPJ" value={fieldValue(client.data.document)} />
        <ClientDetailItem label="RG" value={fieldValue(client.data.rg)} />
        <ClientDetailItem label="Email" value={fieldValue(client.data.email)} />
        <ClientDetailItem label="Telefone" value={fieldValue(client.data.phone)} />
        <ClientDetailItem label="CEP" value={fieldValue(client.data.zipCode)} />
        <ClientDetailItem label="Rua" value={fieldValue(client.data.street)} />
        <ClientDetailItem label="Cidade" value={fieldValue(client.data.city)} />
        <ClientDetailItem label="Estado" value={fieldValue(client.data.state)} />
        <ClientDetailItem label="Complemento/Bairro" value={fieldValue(client.data.address)} />
        <ClientDetailItem label="Observações" value={fieldValue(client.data.notes)} />
        <ClientDetailItem label="Criado em" value={formatDate(client.data.createdAt)} />
        <ClientDetailItem label="Atualizado em" value={formatDate(client.data.updatedAt)} />
      </section> : null}

      {tab === "cases" && cases.isLoading ? <LoadingState label="Carregando processos do cliente" variant="table" columns={5} /> : null}
      {tab === "cases" && cases.isError ? <p className="alert">Não foi possível carregar os processos do cliente.</p> : null}
      {tab === "cases" && cases.data ? <ClientCasesList cases={cases.data} /> : null}

      {tab === "documents" ? <section className="panel">
        {documents.isLoading ? <LoadingState label="Carregando documentos do cliente" variant="table" columns={4} /> : null}
        {documents.isError ? <p className="alert">Não foi possível carregar os documentos do cliente.</p> : null}
        {documents.data ? <DocumentLinksList documents={documents.data} /> : null}
      </section> : null}

      {isDeleteOpen ? (
        <DeleteConfirmationDialog
          title="Excluir cliente"
          confirmText="DELETAR"
          value={deleteText}
          error={deleteError}
          isDeleting={deleteMutation.isPending}
          onChange={setDeleteText}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
        >
          <p>Esta ação exclui permanentemente o cliente abaixo se não houver vínculos.</p>
          <p><strong>Cliente:</strong> {client.data.name}</p>
          <p><strong>Documento:</strong> {fieldValue(client.data.document)}</p>
          <p><strong>Status:</strong> {labelClientStatus(client.data.status)}</p>
          <p>Se houver processos, pagamentos, documentos ou itens de importação, a exclusão será bloqueada.</p>
        </DeleteConfirmationDialog>
      ) : null}
    </>
  );
};
