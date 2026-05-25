import type { CaseStage, CaseStatus, CaseTimelineEventType, CaseType, LegalArea } from "src/services/cases.js";

const caseTypeLabels: Record<CaseType, string> = {
  judicial: "Judicial",
  extrajudicial: "Extrajudicial"
};

const caseStatusLabels: Record<CaseStatus, string> = {
  active: "Ativo",
  on_hold: "Pausado",
  closed: "Encerrado",
  canceled: "Cancelado"
};

const caseStageLabels: Record<CaseStage, string> = {
  initial: "Inicial",
  hearing_scheduled: "Audiência marcada",
  waiting_decision: "Aguardando decisão",
  appeal: "Recurso",
  enforcement: "Execução"
};

const legalAreaLabels: Record<LegalArea, string> = {
  civil: "Cível",
  labor: "Trabalhista",
  family: "Família",
  criminal: "Criminal",
  tax: "Tributário",
  consumer: "Consumidor",
  business: "Empresarial",
  social_security: "Previdenciário",
  other: "Outro"
};

const timelineTypeLabels: Record<CaseTimelineEventType, string> = {
  note: "Nota",
  hearing: "Audiência",
  petition: "Petição",
  decision: "Decisão",
  status_change: "Mudança de status",
  other: "Outro"
};

export const labelCaseType = (value: CaseType) => caseTypeLabels[value];
export const labelCaseStatus = (value: CaseStatus) => caseStatusLabels[value];
export const labelCaseStage = (value: CaseStage | null) => (value ? caseStageLabels[value] : "Não informado");
export const labelLegalArea = (value: LegalArea | null) => (value ? legalAreaLabels[value] : "Não informado");
export const labelTimelineType = (value: CaseTimelineEventType) => timelineTypeLabels[value];
