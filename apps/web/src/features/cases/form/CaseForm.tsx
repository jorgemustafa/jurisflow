import { zodResolver } from "@hookform/resolvers/zod";
import { caseFinanceSchema, type PaymentMethod } from "@magistrum/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "src/components/ui/button.js";
import { Input } from "src/components/ui/input.js";
import { Label } from "src/components/ui/label.js";
import { Select } from "src/components/ui/select.js";
import { Textarea } from "src/components/ui/textarea.js";
import { FieldError } from "src/features/clients/form/FieldError.js";
import {
  moneyInputValue,
  parseMoney,
} from "src/features/finance/utils/money.js";
import {
  calculateFinanceSchedule,
  dateWithDueDay,
  installmentAmountForCount,
} from "src/features/cases/utils/financeSchedule.js";
import {
  createCase,
  getCase,
  updateCase,
  type CaseFormData,
  type CreateCaseData,
} from "src/services/cases.js";
import { ApiError } from "src/services/http.js";
import { LoadingState } from "src/components/ui/LoadingState.js";

const caseFormSchema = z.object({
  clientId: z.string().uuid(),
  caseType: z.enum(["judicial", "extrajudicial"]),
  title: z.string().trim().min(2, "Informe o título").max(255),
  cnjNumber: z.string().max(40),
  status: z.enum(["active", "on_hold", "closed", "canceled"]),
  stage: z.union([
    z.enum([
      "initial",
      "hearing_scheduled",
      "waiting_decision",
      "appeal",
      "enforcement",
    ]),
    z.literal(""),
  ]),
  legalArea: z.union([
    z.enum([
      "civil",
      "labor",
      "family",
      "criminal",
      "tax",
      "consumer",
      "business",
      "social_security",
      "other",
    ]),
    z.literal(""),
  ]),
  opposingParty: z.string().max(255),
  court: z.string().max(120),
  jurisdiction: z.string().max(120),
  division: z.string().max(120),
  description: z.string().max(2000),
  openedAt: z.string(),
  closedAt: z.string(),
});

const emptyCaseForm = (clientId: string): CaseFormData => ({
  clientId,
  caseType: "judicial",
  title: "",
  cnjNumber: "",
  status: "active",
  stage: "",
  legalArea: "",
  opposingParty: "",
  court: "",
  jurisdiction: "",
  division: "",
  description: "",
  openedAt: "",
  closedAt: "",
});

const dateInputValue = (value: string | null) =>
  value ? value.slice(0, 10) : "";
const nextMonthDate = () => {
  const now = new Date();
  const lastDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      Math.min(now.getUTCDate(), lastDay),
    ),
  )
    .toISOString()
    .slice(0, 10);
};

const emptyFinanceForm = () => ({
  total: "",
  entry: "",
  installment: "",
  installmentCount: "",
  firstDueDate: nextMonthDate(),
  dueDay: "",
  entryPaymentMethod: "pix" as PaymentMethod,
});

type FinanceForm = ReturnType<typeof emptyFinanceForm>;

type CaseFormProps =
  | {
      mode: "create";
      clientId: string;
    }
  | {
      mode: "update";
      caseId: string;
    };

export const CaseForm = (props: CaseFormProps) => {
  const isEdit = props.mode === "update";
  const cancelPath = isEdit
    ? `/cases/${props.caseId}`
    : `/clients/${props.clientId}`;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState("");
  const [financeForm, setFinanceForm] = useState(emptyFinanceForm);
  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: emptyCaseForm(
      props.mode === "create"
        ? props.clientId
        : "00000000-0000-0000-0000-000000000000",
    ),
  });
  const watchedType = form.watch("caseType");
  const financeSchedule = calculateFinanceSchedule(
    parseMoney(financeForm.total),
    parseMoney(financeForm.entry),
    parseMoney(financeForm.installment),
    financeForm.firstDueDate,
  );
  const legalCase = useQuery({
    queryKey: ["case", props.mode === "update" ? props.caseId : ""],
    queryFn: () => getCase(props.mode === "update" ? props.caseId : ""),
    enabled: isEdit,
  });

  const mutation = useMutation({
    mutationFn: (data: CaseFormData | CreateCaseData) =>
      isEdit
        ? updateCase(props.caseId, data as CaseFormData)
        : createCase(data as CreateCaseData),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.setQueryData(["case", saved.id], saved);
      navigate(`/cases/${saved.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof CaseFormData, { message });
        });
        setGeneralError(error.message);
      } else {
        setGeneralError("Não foi possível salvar o processo.");
      }
    },
  });

  useEffect(() => {
    if (!legalCase.data) return;
    form.reset({
      clientId: legalCase.data.clientId,
      caseType: legalCase.data.caseType,
      title: legalCase.data.title,
      cnjNumber: legalCase.data.cnjNumber ?? "",
      status: legalCase.data.status,
      stage: legalCase.data.stage ?? "",
      legalArea: legalCase.data.legalArea ?? "",
      opposingParty: legalCase.data.opposingParty ?? "",
      court: legalCase.data.court ?? "",
      jurisdiction: legalCase.data.jurisdiction ?? "",
      division: legalCase.data.division ?? "",
      description: legalCase.data.description ?? "",
      openedAt: dateInputValue(legalCase.data.openedAt),
      closedAt: dateInputValue(legalCase.data.closedAt),
    });
  }, [form, legalCase.data]);

  const submit = (data: CaseFormData) => {
    setGeneralError("");
    const caseData = {
      ...data,
      cnjNumber: data.caseType === "judicial" ? data.cnjNumber : "",
    };
    if (isEdit) {
      mutation.mutate(caseData);
      return;
    }

    const finance = caseFinanceSchema.safeParse({
      totalFeeAmountCents: parseMoney(financeForm.total),
      entryAmountCents: parseMoney(financeForm.entry),
      installmentAmountCents: parseMoney(financeForm.installment),
      firstDueDate: financeForm.firstDueDate,
      entryPaymentMethod: financeForm.entryPaymentMethod,
    });
    if (!finance.success) {
      setGeneralError(
        "Informe valor total, entrada, parcela e primeiro vencimento válidos. A entrada deve ser menor que o total.",
      );
      return;
    }
    mutation.mutate({ ...caseData, finance: finance.data });
  };

  const updateFinanceByInstallment = (next: Partial<FinanceForm>) => {
    setFinanceForm((current) => {
      const updated = { ...current, ...next };
      const schedule = calculateFinanceSchedule(
        parseMoney(updated.total),
        parseMoney(updated.entry),
        parseMoney(updated.installment),
        updated.firstDueDate,
      );
      return {
        ...updated,
        dueDay: String(schedule.dueDay ?? ""),
        installmentCount: schedule.installmentCount
          ? String(schedule.installmentCount)
          : "",
      };
    });
  };

  const updateFinanceByCount = (installmentCount: string) => {
    setFinanceForm((current) => {
      const balanceCents = parseMoney(current.total) - parseMoney(current.entry);
      const count = Number(installmentCount);
      const installmentCents = installmentAmountForCount(balanceCents, count);
      return {
        ...current,
        installmentCount,
        installment: Number.isFinite(installmentCents)
          ? moneyInputValue(installmentCents)
          : current.installment,
      };
    });
  };

  if (legalCase.isLoading) return <LoadingState label="Carregando processo" />;
  if (legalCase.isError)
    return <p className="alert">Processo não encontrado.</p>;

  return (
    <>
      <header className="page-header">
        <span>Processos</span>
        <h1>{isEdit ? "Editar processo" : "Novo processo"}</h1>
      </header>

      <form className="form" onSubmit={form.handleSubmit(submit)}>
        {generalError ? <p className="alert">{generalError}</p> : null}

        <input type="hidden" {...form.register("clientId")} />

        <div className="grid gap-2">
          <Label htmlFor="caseType">Tipo</Label>
          <Select id="caseType" {...form.register("caseType")}>
            <option value="judicial">Judicial</option>
            <option value="extrajudicial">Extrajudicial</option>
          </Select>
          <FieldError message={form.formState.errors.caseType?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="title">Título</Label>
          <Input id="title" {...form.register("title")} />
          <FieldError message={form.formState.errors.title?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cnjNumber">CNJ</Label>
          <Input
            id="cnjNumber"
            disabled={watchedType === "extrajudicial"}
            {...form.register("cnjNumber")}
          />
          <FieldError message={form.formState.errors.cnjNumber?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...form.register("status")}>
            <option value="active">Ativo</option>
            <option value="on_hold">Pausado</option>
            <option value="closed">Encerrado</option>
            <option value="canceled">Cancelado</option>
          </Select>
          <FieldError message={form.formState.errors.status?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="stage">Fase</Label>
          <Select id="stage" {...form.register("stage")}>
            <option value="">Não informado</option>
            <option value="initial">Inicial</option>
            <option value="hearing_scheduled">Audiência marcada</option>
            <option value="waiting_decision">Aguardando decisão</option>
            <option value="appeal">Recurso</option>
            <option value="enforcement">Execução</option>
          </Select>
          <FieldError message={form.formState.errors.stage?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="legalArea">Área jurídica</Label>
          <Select id="legalArea" {...form.register("legalArea")}>
            <option value="">Não informado</option>
            <option value="civil">Cível</option>
            <option value="labor">Trabalhista</option>
            <option value="family">Família</option>
            <option value="criminal">Criminal</option>
            <option value="tax">Tributário</option>
            <option value="consumer">Consumidor</option>
            <option value="business">Empresarial</option>
            <option value="social_security">Previdenciário</option>
            <option value="other">Outro</option>
          </Select>
          <FieldError message={form.formState.errors.legalArea?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="opposingParty">Parte contrária</Label>
          <Input id="opposingParty" {...form.register("opposingParty")} />
          <FieldError message={form.formState.errors.opposingParty?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="court">Tribunal</Label>
          <Input id="court" {...form.register("court")} />
          <FieldError message={form.formState.errors.court?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="jurisdiction">Comarca</Label>
          <Input id="jurisdiction" {...form.register("jurisdiction")} />
          <FieldError message={form.formState.errors.jurisdiction?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="division">Vara</Label>
          <Input id="division" {...form.register("division")} />
          <FieldError message={form.formState.errors.division?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="openedAt">Abertura</Label>
          <Input id="openedAt" type="date" {...form.register("openedAt")} />
          <FieldError message={form.formState.errors.openedAt?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="closedAt">Encerramento</Label>
          <Input id="closedAt" type="date" {...form.register("closedAt")} />
          <FieldError message={form.formState.errors.closedAt?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={5}
            {...form.register("description")}
          />
          <FieldError message={form.formState.errors.description?.message} />
        </div>

        {!isEdit ? (
          <fieldset className="finance-form-section">
            <legend>Acordo financeiro</legend>
            <div className="grid gap-2">
              <Label htmlFor="totalFee">Valor total (R$)</Label>
              <Input
                id="totalFee"
                value={financeForm.total}
                onChange={(event) =>
                  updateFinanceByInstallment({ total: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entryAmount">Entrada (R$)</Label>
              <Input
                id="entryAmount"
                value={financeForm.entry}
                onChange={(event) =>
                  updateFinanceByInstallment({ entry: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="installmentAmount">Valor da parcela (R$)</Label>
              <Input
                id="installmentAmount"
                value={financeForm.installment}
                onChange={(event) =>
                  updateFinanceByInstallment({
                    installment: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="installmentCount">Quantidade de parcelas</Label>
              <Input
                id="installmentCount"
                type="number"
                min={1}
                step={1}
                value={financeForm.installmentCount}
                onChange={(event) => updateFinanceByCount(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDay">Dia de vencimento</Label>
              <Input
                id="dueDay"
                type="number"
                min={1}
                max={31}
                value={financeForm.dueDay}
                onChange={(event) => {
                  const dueDay = Number(event.target.value);
                  updateFinanceByInstallment({
                    dueDay: event.target.value,
                    firstDueDate: dateWithDueDay(
                      financeForm.firstDueDate,
                      dueDay,
                    ),
                  });
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="firstDueDate">Início das parcelas</Label>
              <Input
                id="firstDueDate"
                type="date"
                value={financeForm.firstDueDate}
                onChange={(event) =>
                  updateFinanceByInstallment({
                    firstDueDate: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastDueDate">Fim das parcelas</Label>
              <Input
                id="lastDueDate"
                type="date"
                readOnly
                value={financeSchedule.lastDueDate}
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor restante</Label>
              <Input
                readOnly
                value={
                  Number.isFinite(financeSchedule.balanceCents)
                    ? moneyInputValue(financeSchedule.balanceCents)
                    : ""
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entryPaymentMethod">Forma da entrada</Label>
              <Select
                id="entryPaymentMethod"
                value={financeForm.entryPaymentMethod}
                onChange={(event) =>
                  setFinanceForm((current) => ({
                    ...current,
                    entryPaymentMethod: event.target.value as PaymentMethod,
                  }))
                }
              >
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="bank_transfer">Transferência</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_card">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                <option value="other">Outro</option>
              </Select>
            </div>
          </fieldset>
        ) : null}

        <div className="actions">
          <Button type="submit" disabled={mutation.isPending}>
            Salvar
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate(cancelPath)}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
};
