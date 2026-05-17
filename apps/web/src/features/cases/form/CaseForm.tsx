import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "src/components/ui/button.js";
import { Input } from "src/components/ui/input.js";
import { Label } from "src/components/ui/label.js";
import { Select } from "src/components/ui/select.js";
import { Textarea } from "src/components/ui/textarea.js";
import { FieldError } from "src/features/clients/form/FieldError.js";
import { createCase, type CaseFormData } from "src/services/cases.js";
import { ApiError } from "src/services/http.js";

const caseFormSchema = z.object({
  clientId: z.string().uuid(),
  caseType: z.enum(["judicial", "extrajudicial"]),
  title: z.string().trim().min(2, "Informe o título").max(255),
  cnjNumber: z.string().max(40),
  status: z.enum(["active", "on_hold", "closed", "canceled"]),
  stage: z.union([z.enum(["initial", "hearing_scheduled", "waiting_decision", "appeal", "enforcement"]), z.literal("")]),
  legalArea: z.union([z.enum(["civil", "labor", "family", "criminal", "tax", "consumer", "business", "social_security", "other"]), z.literal("")]),
  opposingParty: z.string().max(255),
  court: z.string().max(120),
  jurisdiction: z.string().max(120),
  division: z.string().max(120),
  description: z.string().max(2000),
  openedAt: z.string(),
  closedAt: z.string()
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
  closedAt: ""
});

export const CaseForm = ({ clientId }: { clientId: string }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState("");
  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: emptyCaseForm(clientId)
  });
  const watchedType = form.watch("caseType");

  const mutation = useMutation({
    mutationFn: createCase,
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
        setGeneralError(Object.keys(error.fieldErrors).length ? "" : error.message);
      } else {
        setGeneralError("Não foi possível salvar o processo.");
      }
    }
  });

  const submit = (data: CaseFormData) => {
    setGeneralError("");
    mutation.mutate({ ...data, cnjNumber: data.caseType === "judicial" ? data.cnjNumber : "" });
  };

  return (
    <>
      <header className="page-header">
        <span>Processos</span>
        <h1>Novo processo</h1>
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
          <Input id="cnjNumber" disabled={watchedType === "extrajudicial"} {...form.register("cnjNumber")} />
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
          <Textarea id="description" rows={5} {...form.register("description")} />
          <FieldError message={form.formState.errors.description?.message} />
        </div>

        <div className="actions">
          <Button type="submit" disabled={mutation.isPending}>
            Salvar
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate(`/clients/${clientId}`)}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
};
