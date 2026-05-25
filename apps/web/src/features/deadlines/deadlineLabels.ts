import type { DeadlineAlertLevel, DeadlineStatus } from "src/services/deadlines.js";

const statusLabels: Record<DeadlineStatus, string> = {
  pending: "Pendente",
  done: "Concluído",
  canceled: "Cancelado"
};

const alertLabels: Record<DeadlineAlertLevel, string> = {
  overdue: "Atrasado",
  due_soon: "Próximo",
  none: "Sem alerta"
};

export const labelDeadlineStatus = (status: DeadlineStatus) => statusLabels[status];
export const labelDeadlineAlert = (alert: DeadlineAlertLevel) => alertLabels[alert];
