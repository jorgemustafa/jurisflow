import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CircleDollarSign, FileText, Pencil, Plus, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router";
import {
  ApiError,
  Client,
  ClientFormData,
  ClientStatus,
  FinancePaymentSummary,
  createClient,
  getFinanceDashboard,
  getClient,
  listClients,
  updateClient,
  updateClientStatus
} from "./api.js";

const modules = [
  { name: "Clientes", path: "/clients", icon: Users },
  { name: "Processos", path: "#", icon: BriefcaseBusiness },
  { name: "Financeiro", path: "/finance", icon: CircleDollarSign },
  { name: "Documentos", path: "#", icon: FileText }
];

const emptyForm: ClientFormData = {
  type: "individual",
  name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  notes: ""
};

function labelType(type: Client["type"]) {
  return type === "individual" ? "Pessoa física" : "Pessoa jurídica";
}

function labelStatus(status: ClientStatus) {
  return status === "active" ? "Ativo" : "Inativo";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function fieldValue(value: string | null) {
  return value?.trim() ? value : "Não informado";
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function Layout() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <strong>JurisFlow</strong>
        <nav>
          {modules.map((module) =>
            module.path === "#" ? (
              <a href="#" key={module.name}>
                <module.icon size={18} />
                {module.name}
              </a>
            ) : (
              <NavLink to={module.path} key={module.name}>
                <module.icon size={18} />
                {module.name}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <section className="workspace">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/new" element={<ClientFormPage />} />
          <Route path="/clients/:id" element={<ClientDetailsPage />} />
          <Route path="/clients/:id/edit" element={<ClientFormPage />} />
          <Route path="/finance" element={<FinancePage />} />
        </Routes>
      </section>
    </main>
  );
}

function FinancePage() {
  const [month, setMonth] = useState(currentMonth());
  const dashboard = useQuery({
    queryKey: ["finance-dashboard", month],
    queryFn: () => getFinanceDashboard(month)
  });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Financeiro</span>
          <h1>Dashboard financeiro</h1>
        </div>
        <input className="month-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </header>

      {dashboard.isLoading ? <p>Carregando financeiro...</p> : null}
      {dashboard.isError ? <p className="alert">Não foi possível carregar o dashboard financeiro.</p> : null}

      {dashboard.data ? (
        <>
          <section className="metric-grid">
            <Metric label="Recebido no mês" value={formatMoney(dashboard.data.receivedInMonthCents)} />
            <Metric label="A vencer no mês" value={formatMoney(dashboard.data.dueInMonthCents)} />
            <Metric label="A receber" value={formatMoney(dashboard.data.totalToReceiveCents)} />
            <Metric label="Em atraso" value={formatMoney(dashboard.data.overdueAmountCents)} />
            <Metric label="Clientes ativos" value={String(dashboard.data.activeClients)} />
            <Metric label="Processos em andamento" value={String(dashboard.data.runningCases)} />
          </section>

          <PaymentSummaryList title="Pagamentos em atraso" payments={dashboard.data.overduePayments} empty="Nenhum pagamento em atraso." />
          <PaymentSummaryList
            title="Vencimentos do mês"
            payments={dashboard.data.upcomingPayments}
            empty="Nenhum vencimento pendente no mês selecionado."
          />
        </>
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PaymentSummaryList({ title, payments, empty }: { title: string; payments: FinancePaymentSummary[]; empty: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {payments.length === 0 ? (
        <p className="empty-inline">{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Processo</th>
                <th>Parcela</th>
                <th>Valor</th>
                <th>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.clientName}</td>
                  <td>{payment.caseTitle ?? "Não vinculado"}</td>
                  <td>
                    {payment.installmentNumber}/{payment.installmentTotal}
                  </td>
                  <td>{formatMoney(payment.amountCents)}</td>
                  <td>{formatDate(payment.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Dashboard() {
  return (
    <>
      <header className="page-header">
        <span>Escritório jurídico</span>
        <h1>Operação centralizada</h1>
        <p>Base inicial para centralizar fluxos de clientes, processos, financeiro e documentos.</p>
      </header>

      <div className="module-grid">
        {modules.map((module) => (
          <Link className="module-card" to={module.path === "#" ? "/" : module.path} key={module.name}>
            <module.icon size={22} />
            <h2>{module.name}</h2>
          </Link>
        ))}
      </div>
    </>
  );
}

function ClientsPage() {
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
}

function ClientsTable({ clients }: { clients: Client[] }) {
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
              <td>{labelType(client.type)}</td>
              <td>{fieldValue(client.document)}</td>
              <td>{fieldValue(client.email ?? client.phone)}</td>
              <td>
                <span className={`badge ${client.status}`}>{labelStatus(client.status)}</span>
              </td>
              <td>{formatDate(client.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientDetailsPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id), enabled: Boolean(id) });
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
          <span>{labelType(client.data.type)}</span>
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
        <Detail label="Status" value={labelStatus(client.data.status)} />
        <Detail label="Documento" value={fieldValue(client.data.document)} />
        <Detail label="Email" value={fieldValue(client.data.email)} />
        <Detail label="Telefone" value={fieldValue(client.data.phone)} />
        <Detail label="Endereço" value={fieldValue(client.data.address)} />
        <Detail label="Observações" value={fieldValue(client.data.notes)} />
        <Detail label="Criado em" value={formatDate(client.data.createdAt)} />
        <Detail label="Atualizado em" value={formatDate(client.data.updatedAt)} />
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ClientFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const client = useQuery({ queryKey: ["client", id], queryFn: () => getClient(id!), enabled: isEdit });
  const mutation = useMutation({
    mutationFn: (data: ClientFormData) => (isEdit ? updateClient(id!, data) : createClient(data)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.setQueryData(["client", saved.id], saved);
      navigate(`/clients/${saved.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setGeneralError(Object.keys(error.fieldErrors).length ? "" : error.message);
      } else {
        setGeneralError("Não foi possível salvar o cliente.");
      }
    }
  });

  useEffect(() => {
    if (!client.data) return;
    setForm({
      type: client.data.type,
      name: client.data.name,
      document: client.data.document ?? "",
      email: client.data.email ?? "",
      phone: client.data.phone ?? "",
      address: client.data.address ?? "",
      notes: client.data.notes ?? ""
    });
  }, [client.data]);

  function updateField(field: keyof ClientFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError("");
    mutation.mutate(form);
  }

  if (isEdit && client.isLoading) return <p>Carregando cliente...</p>;

  return (
    <>
      <header className="page-header">
        <span>Clientes</span>
        <h1>{isEdit ? "Editar cliente" : "Novo cliente"}</h1>
      </header>

      <form className="form" onSubmit={submit}>
        {generalError ? <p className="alert">{generalError}</p> : null}

        <label>
          Tipo
          <select value={form.type} onChange={(event) => updateField("type", event.target.value as ClientFormData["type"])}>
            <option value="individual">Pessoa física</option>
            <option value="company">Pessoa jurídica</option>
          </select>
        </label>

        <FieldError message={fieldErrors.type} />

        <label>
          {form.type === "individual" ? "Nome completo" : "Razão social"}
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.name} />

        <label>
          Documento
          <input value={form.document} onChange={(event) => updateField("document", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.document} />

        <label>
          Email
          <input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.email} />

        <label>
          Telefone
          <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.phone} />

        <label>
          Endereço
          <textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} rows={3} />
        </label>
        <FieldError message={fieldErrors.address} />

        <label>
          Observações
          <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={5} />
        </label>
        <FieldError message={fieldErrors.notes} />

        <div className="actions">
          <button className="button primary" type="submit" disabled={mutation.isPending}>
            Salvar
          </button>
          <button className="button" type="button" onClick={() => navigate(isEdit ? `/clients/${id}` : "/clients")}>
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="field-error">{message}</p> : null;
}

export function App() {
  return <Layout />;
}
