import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCases, type CaseFilters } from "src/services/cases.js";
import { CasesTable } from "src/features/cases/list/CasesTable.js";

const defaultFilters: CaseFilters = {
  q: "",
  status: "active",
  caseType: "all",
  stage: "all",
  legalArea: "all"
};

export const CasesPage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const cases = useQuery({
    queryKey: ["cases", filters],
    queryFn: () => listCases(filters)
  });

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Processos</span>
          <h1>Gestão de processos</h1>
        </div>
      </header>

      <section className="toolbar cases-toolbar">
        <input
          placeholder="Buscar por título, cliente, parte contrária ou CNJ"
          value={filters.q}
          onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
        />
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="active">Ativos</option>
          <option value="on_hold">Pausados</option>
          <option value="closed">Encerrados</option>
          <option value="canceled">Cancelados</option>
          <option value="all">Todos</option>
        </select>
        <select value={filters.caseType} onChange={(event) => setFilters((current) => ({ ...current, caseType: event.target.value }))}>
          <option value="all">Todos os tipos</option>
          <option value="judicial">Judicial</option>
          <option value="extrajudicial">Extrajudicial</option>
        </select>
        <select value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}>
          <option value="all">Todas as fases</option>
          <option value="initial">Inicial</option>
          <option value="hearing_scheduled">Audiência marcada</option>
          <option value="waiting_decision">Aguardando decisão</option>
          <option value="appeal">Recurso</option>
          <option value="enforcement">Execução</option>
        </select>
        <select value={filters.legalArea} onChange={(event) => setFilters((current) => ({ ...current, legalArea: event.target.value }))}>
          <option value="all">Todas as áreas</option>
          <option value="civil">Cível</option>
          <option value="labor">Trabalhista</option>
          <option value="family">Família</option>
          <option value="criminal">Criminal</option>
          <option value="tax">Tributário</option>
          <option value="consumer">Consumidor</option>
          <option value="business">Empresarial</option>
          <option value="social_security">Previdenciário</option>
          <option value="other">Outro</option>
        </select>
      </section>

      {cases.isLoading ? <p>Carregando processos...</p> : null}
      {cases.isError ? <p className="alert">Não foi possível carregar os processos.</p> : null}
      {cases.data ? <CasesTable cases={cases.data} /> : null}
    </>
  );
};
