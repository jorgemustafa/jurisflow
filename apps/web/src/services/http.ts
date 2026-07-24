export class ApiError extends Error {
  fieldErrors: Record<string, string>;
  linkedRecords: { label: string; count: number }[];
  status: number;

  constructor(message: string, fieldErrors: Record<string, string> = {}, status = 0, linkedRecords: { label: string; count: number }[] = []) {
    super(message);
    this.fieldErrors = fieldErrors;
    this.linkedRecords = linkedRecords;
    this.status = status;
  }
}

export const shouldRetryRequest = (failureCount: number, error: unknown) =>
  !(error instanceof ApiError && error.status === 401) && failureCount < 3;

type ApiIssue = {
  code?: string;
  message?: string;
  path?: unknown[];
  minimum?: number;
  maximum?: number;
  validation?: string;
};

type ApiErrorBody = {
  message?: string;
  issues?: ApiIssue[];
  linkedRecords?: { label: string; count: number }[];
};

const backendMessages: Record<string, string> = {
  "Invalid email or password": "Email ou senha inválidos.",
  "Invalid token": "Sua sessão expirou. Entre novamente.",
  "Client not found": "Cliente não encontrado.",
  "Client must be active": "O cliente precisa estar ativo.",
  "Client document already exists": "Já existe um cliente com este documento.",
  "Client has linked records": "O cliente possui vínculos e não pode ser excluído.",
  "Document is invalid for client type": "O documento não é válido para o tipo de cliente.",
  "Case not found": "Processo não encontrado.",
  "Case must belong to the selected client": "O processo deve pertencer ao cliente selecionado.",
  "Case must belong to the payment client": "O processo deve pertencer ao cliente do pagamento.",
  "Case CNJ already exists": "Já existe um processo com este número CNJ.",
  "Case already imported": "Este processo já foi importado.",
  "CNJ is only allowed for judicial cases": "O número CNJ só pode ser informado em processos judiciais.",
  "Case has pending finance": "O processo possui valores financeiros pendentes.",
  "Responsible user must be an active lawyer or admin": "O responsável deve ser um advogado ou administrador ativo.",
  "Deadline not found": "Prazo não encontrado.",
  "Payment not found": "Pagamento não encontrado.",
  "First due date must be in the next calendar month": "O primeiro vencimento deve ser no próximo mês.",
  "Generated payments only allow notes to be updated": "Em pagamentos gerados, apenas as observações podem ser alteradas.",
  "Paid payments can only correct paidAt or be canceled": "Pagamentos recebidos só permitem corrigir a data ou cancelar.",
  "Canceled payments can only edit cancel reason and notes": "Pagamentos cancelados só permitem alterar o motivo e as observações.",
  "Use the paid action to register a payment receipt": "Use a ação Receber para registrar o pagamento.",
  "Canceled payment cannot be marked as paid": "Um pagamento cancelado não pode ser recebido.",
  "Generated payments cannot be canceled": "Pagamentos gerados não podem ser cancelados.",
  "Payment is already canceled": "O pagamento já está cancelado.",
  "Case has no CNJ number to sync": "O processo não possui número CNJ para atualização.",
  "Case not found in DataJud": "Processo não encontrado no DataJud.",
  "DataJud request failed": "Falha ao consultar o DataJud.",
  "DATAJUD_API_KEY is not configured": "A integração com o DataJud não está configurada.",
  "Document file is required": "Selecione um arquivo.",
  "Document file is empty": "O arquivo está vazio.",
  "Document file is too large": "O arquivo excede o limite permitido.",
  "Unsupported document type": "Este tipo de arquivo não é permitido.",
  "Document content does not match its type": "O conteúdo não corresponde ao tipo do arquivo.",
  "Document not found": "Documento não encontrado.",
  "Import batch not found": "Lote de importação não encontrado.",
  "Import item not found": "Item de importação não encontrado.",
  "Import batch is not open": "O lote de importação não está aberto.",
  "Import item cannot be updated in its current status": "O item não pode ser alterado no status atual.",
  "Only pending items can be discarded": "Apenas itens pendentes podem ser descartados.",
  "Only discarded items can be restored": "Apenas itens descartados podem ser restaurados.",
  "Only pending items can be linked to a client": "Apenas itens pendentes podem ser vinculados a um cliente.",
  "Only pending items can receive finance data": "Apenas itens pendentes podem receber dados financeiros.",
  "No items are ready to import; fill client and finance data for at least one pending item": "Preencha cliente e financeiro de ao menos um item pendente.",
};

export const backendErrorMessage = (message: string | null, fallback: string) =>
  (message && backendMessages[message]) || fallback;

const linkedRecordsMessage = (records: { label: string; count: number }[]) =>
  records.map((record) => `${record.label} (${record.count})`).join(", ");

export const issueMessage = (issue: ApiIssue) => {
  const translated = issue.message ? backendMessages[issue.message] : undefined;
  if (translated) return translated;
  if (issue.code === "invalid_enum_value") return "Selecione uma opção válida.";
  if (issue.code === "invalid_date") return "Informe uma data válida.";
  if (issue.code === "invalid_string") {
    if (issue.validation === "email") return "Informe um email válido.";
    if (issue.validation === "uuid") return "Selecione um registro válido.";
    return "Informe um valor válido.";
  }
  if (issue.code === "too_small" && issue.minimum !== undefined)
    return `Informe ao menos ${issue.minimum} caracteres.`;
  if (issue.code === "too_big" && issue.maximum !== undefined)
    return `Informe no máximo ${issue.maximum} caracteres.`;
  if (issue.code === "invalid_type") return "Campo obrigatório ou inválido.";
  return "Valor inválido.";
};

export const responseErrorMessage = (
  status: number,
  body: ApiErrorBody | null,
) => {
  if (body?.issues?.length) return issueMessage(body.issues[0]);
  if (body?.message === "Client has linked records" && body.linkedRecords?.length)
    return `Este cliente não pode ser excluído. Vínculos: ${linkedRecordsMessage(body.linkedRecords)}.`;
  if (body?.message && backendMessages[body.message])
    return backendMessages[body.message];
  if (status >= 500) return "Ocorreu um erro interno. Tente novamente.";
  if (status === 401) return "Email ou senha inválidos.";
  if (status === 403) return "Você não tem permissão para esta operação.";
  if (status === 404) return "Registro não encontrado.";
  if (status === 409)
    return "Não foi possível concluir devido ao estado atual do registro.";
  return "Dados inválidos. Revise os campos.";
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

type AppRequestInit = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

let authHandlers: {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
  logout: () => void;
} | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function configureAuthHandlers(handlers: typeof authHandlers) {
  authHandlers = handlers;
}

const tokenExpiresSoon = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return Boolean(payload.exp && payload.exp <= Math.floor(Date.now() / 1000) + 30);
  } catch {
    return false;
  }
};

const refreshAccessToken = () => {
  if (!authHandlers) return Promise.resolve(null);
  refreshPromise ??= authHandlers.refresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
};

async function fetchApi(path: string, init?: AppRequestInit) {
  const token = init?.skipAuth ? null : authHandlers?.getAccessToken();
  const { skipAuth: _skipAuth, skipRefresh: _skipRefresh, ...fetchInit } = init ?? {};
  const hasJsonBody = fetchInit.body !== undefined && fetchInit.body !== null && !(fetchInit.body instanceof FormData);

  return fetch(`${API_URL}${path}`, {
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchInit.headers
    },
    ...fetchInit
  });
}

export const request = async <T>(path: string, init?: AppRequestInit): Promise<T> => {
  if (!init?.skipAuth && authHandlers) {
    const token = authHandlers.getAccessToken();
    if (token && tokenExpiresSoon(token) && !(await refreshAccessToken())) {
      authHandlers.logout();
      throw new ApiError(backendMessages["Invalid token"], {}, 401);
    }
  }

  let response = await fetchApi(path, init);

  if (response.status === 401 && !init?.skipAuth && !init?.skipRefresh && authHandlers) {
    const token = await refreshAccessToken();
    if (token) response = await fetchApi(path, { ...init, skipRefresh: true });
    else authHandlers.logout();
  }

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const fieldErrors: Record<string, string> = {};

    if (Array.isArray(body?.issues)) {
      for (const issue of body.issues) {
        const field = issue.path?.[0];
        if (field) fieldErrors[field] = issueMessage(issue);
      }
    }

    if (body?.field)
      fieldErrors[body.field] =
        backendMessages[body.message] ?? responseErrorMessage(response.status, body);
    throw new ApiError(responseErrorMessage(response.status, body), fieldErrors, response.status, body?.linkedRecords ?? []);
  }

  return response.json() as Promise<T>;
};

export const requestBlob = async (path: string): Promise<Blob> => {
  let response = await fetchApi(path);
  if (response.status === 401 && authHandlers) {
    const token = await refreshAccessToken();
    if (token) response = await fetchApi(path, { skipRefresh: true });
    else authHandlers.logout();
  }
  if (!response.ok) throw new ApiError(responseErrorMessage(response.status, await response.json().catch(() => null)), {}, response.status);
  return response.blob();
};

export const searchParams = (filters: Record<string, string>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};
