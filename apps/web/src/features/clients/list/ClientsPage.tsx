import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { listClients } from "../../../services/clients.js";
import { ClientsTable } from "./ClientsTable.js";

export const ClientsPage = () => {
  const [filters, setFilters] = useState({ q: "", status: "active", type: "all" });
  const clients = useQuery({
    queryKey: ["clients", filters],
    queryFn: () => listClients(filters)
  });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Clientes</span>
          <h1>Gestão de clientes</h1>
        </div>
        <Link className="button primary" to="/clients/new">
          <Plus size={18} />
          Novo cliente
        </Link>
      </header>

      <section className="toolbar">
        <input
          placeholder="Buscar por nome, documento, email ou telefone"
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
        />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
        <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
          <option value="all">Todos os tipos</option>
          <option value="individual">Pessoa física</option>
          <option value="company">Pessoa jurídica</option>
        </select>
      </section>

      {clients.isLoading ? <p>Carregando clientes...</p> : null}
      {clients.isError ? <p className="alert">Não foi possível carregar os clientes.</p> : null}
      {clients.data ? <ClientsTable clients={clients.data} /> : null}
    </>
  );
};
