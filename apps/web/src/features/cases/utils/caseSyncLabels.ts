import type { CaseSyncStatus, CaseSyncTrigger } from "src/services/cases.js";

const syncStatusLabels: Record<CaseSyncStatus, string> = {
  success: "Atualizado",
  no_changes: "Sem novidades",
  failed: "Falhou"
};

const syncTriggerLabels: Record<CaseSyncTrigger, string> = {
  manual: "Manual",
  scheduled: "Automático"
};

const syncStatusBadge: Record<CaseSyncStatus, string> = {
  success: "active",
  no_changes: "closed",
  failed: "canceled"
};

export const labelSyncStatus = (value: CaseSyncStatus) => syncStatusLabels[value];
export const labelSyncTrigger = (value: CaseSyncTrigger) => syncTriggerLabels[value];
export const syncStatusBadgeClass = (value: CaseSyncStatus) => syncStatusBadge[value];
