import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import { listCases } from "src/services/cases.js";
import { ClientStatus, getClient, updateClientStatus } from "src/services/clients.js";
import { fieldValue, formatDate } from "src/utils/format.js";
import { ClientCasesList } from "src/features/clients/detail/ClientCasesList.js";
import { ClientDetailItem } from "src/features/clients/detail/ClientDetailItem.js";
import { labelClientStatus, labelClientType } from "src/features/clients/utils/clientLabels.js";

export const ClientDetailsPage = () => {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id), enabled: Boolean(id) });
  const cases = useQuery({
    queryKey: ["cases", "client", id],
    queryFn: () => listCases({ q: "", status: "all", caseType: "all", stage: "all", legalArea: "all", clientId: id }),
    enabled: Boolean(id)
  });
  const statusMutation = useMutation({
    mutationFn: (status: ClientStatus) => updateClientStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["client", id], updated);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  });

  if (client.isLoading) return <p>Carregando cliente...</p>;
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
          <Link className="button primary" to={`/clients/${client.data.id}/edit`}>
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </header>

      <section className="details-grid">
        <ClientDetailItem label="Status" value={labelClientStatus(client.data.status)} />
        <ClientDetailItem label="Documento" value={fieldValue(client.data.document)} />
        <ClientDetailItem label="Email" value={fieldValue(client.data.email)} />
        <ClientDetailItem label="Telefone" value={fieldValue(client.data.phone)} />
        <ClientDetailItem label="Endereço" value={fieldValue(client.data.address)} />
        <ClientDetailItem label="Observações" value={fieldValue(client.data.notes)} />
        <ClientDetailItem label="Criado em" value={formatDate(client.data.createdAt)} />
        <ClientDetailItem label="Atualizado em" value={formatDate(client.data.updatedAt)} />
      </section>

      {cases.isLoading ? <p>Carregando processos do cliente...</p> : null}
      {cases.isError ? <p className="alert">Não foi possível carregar os processos do cliente.</p> : null}
      {cases.data ? <ClientCasesList cases={cases.data} /> : null}
    </>
  );
};
