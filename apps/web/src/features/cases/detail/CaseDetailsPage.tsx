import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Link, useParams } from "react-router";
import { getCase } from "src/services/cases.js";
import { fieldValue, formatDate, formatMoney } from "src/utils/format.js";
import { labelCaseStage, labelCaseStatus, labelCaseType, labelLegalArea } from "src/features/cases/utils/caseLabels.js";
import { ClientDetailItem } from "src/features/clients/detail/ClientDetailItem.js";

const optionalDate = (value: string | null) => (value ? formatDate(value) : "Não informado");
const optionalMoney = (value: number | null) => (value === null ? "Não informado" : formatMoney(value));

export const CaseDetailsPage = () => {
  const { id = "" } = useParams();
  const legalCase = useQuery({ queryKey: ["case", id], queryFn: () => getCase(id), enabled: Boolean(id) });

  if (legalCase.isLoading) return <p>Carregando processo...</p>;
  if (legalCase.isError || !legalCase.data) return <p className="alert">Processo não encontrado.</p>;

  const item = legalCase.data;

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>{labelCaseType(item.caseType)}</span>
          <h1>{item.title}</h1>
          <p>{fieldValue(item.description)}</p>
        </div>
        <div className="actions">
          <Link className="button" to="/cases">
            Voltar
          </Link>
          <Link className="button primary" to={`/clients/${item.clientId}`}>
            Ver cliente
          </Link>
          <Link className="button primary" to={`/cases/${item.id}/edit`}>
            <Pencil size={18} />
            Editar
          </Link>
        </div>
      </header>

      <section className="details-grid">
        <ClientDetailItem label="Status" value={labelCaseStatus(item.status)} />
        <ClientDetailItem label="Tipo" value={labelCaseType(item.caseType)} />
        <ClientDetailItem label="CNJ" value={fieldValue(item.cnjNumber)} />
        <ClientDetailItem label="Área jurídica" value={labelLegalArea(item.legalArea)} />
        <ClientDetailItem label="Fase" value={labelCaseStage(item.stage)} />
        <ClientDetailItem label="Parte contrária" value={fieldValue(item.opposingParty)} />
        <ClientDetailItem label="Tribunal" value={fieldValue(item.court)} />
        <ClientDetailItem label="Comarca" value={fieldValue(item.jurisdiction)} />
        <ClientDetailItem label="Vara" value={fieldValue(item.division)} />
        <ClientDetailItem label="Honorários totais" value={optionalMoney(item.totalFeeAmountCents)} />
        <ClientDetailItem label="Abertura" value={optionalDate(item.openedAt)} />
        <ClientDetailItem label="Encerramento" value={optionalDate(item.closedAt)} />
        <ClientDetailItem label="Cliente" value={item.clientId} />
        <ClientDetailItem label="Responsável" value={fieldValue(item.responsibleUserId)} />
        <ClientDetailItem label="Criado em" value={formatDate(item.createdAt)} />
        <ClientDetailItem label="Atualizado em" value={formatDate(item.updatedAt)} />
      </section>
    </>
  );
};
