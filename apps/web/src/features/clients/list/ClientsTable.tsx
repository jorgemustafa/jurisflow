import { Link } from "react-router";
import type { Client } from "../../../services/clients.js";
import { fieldValue, formatDate } from "../../../utils/format.js";
import { labelClientStatus, labelClientType } from "../utils/clientLabels.js";

export const ClientsTable = ({ clients }: { clients: Client[] }) => {
  if (clients.length === 0) return <p className="empty">Nenhum cliente encontrado.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo</th>
            <th>Documento</th>
            <th>Contato</th>
            <th>Status</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>
                <Link className="table-link" to={`/clients/${client.id}`}>
                  {client.name}
                </Link>
              </td>
              <td>{labelClientType(client.type)}</td>
              <td>{fieldValue(client.document)}</td>
              <td>{fieldValue(client.email ?? client.phone)}</td>
              <td>
                <span className={`badge ${client.status}`}>{labelClientStatus(client.status)}</span>
              </td>
              <td>{formatDate(client.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
