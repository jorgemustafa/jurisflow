import { zodResolver } from "@hookform/resolvers/zod";
import { clientFormSchema, type ClientFormData } from "@magistrum/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Button } from "src/components/ui/button.js";
import { Input } from "src/components/ui/input.js";
import { Label } from "src/components/ui/label.js";
import { Select } from "src/components/ui/select.js";
import { Textarea } from "src/components/ui/textarea.js";
import { createClient, getClient, updateClient } from "src/services/clients.js";
import { ApiError } from "src/services/http.js";
import { FieldError } from "src/features/clients/form/FieldError.js";
import { emptyClientForm } from "src/features/clients/form/utils/clientFormDefaults.js";
import { LoadingState } from "src/components/ui/LoadingState.js";

type ClientFormProps = {
  clientId?: string;
  mode: "create" | "update";
};

export const ClientForm = ({ clientId, mode }: ClientFormProps) => {
  const isEdit = mode === "update";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState("");
  const [cepFeedback, setCepFeedback] = useState("");
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientForm
  });
  const watchedType = form.watch("type");
  const watchedZipCode = form.watch("zipCode");

  const client = useQuery({ queryKey: ["client", clientId], queryFn: () => getClient(clientId!), enabled: isEdit && Boolean(clientId) });
  const mutation = useMutation({
    mutationFn: (data: ClientFormData) => (isEdit ? updateClient(clientId!, data) : createClient(data)),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.setQueryData(["client", saved.id], saved);
      navigate(`/clients/${saved.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof ClientFormData, { message });
        });
        setGeneralError(error.message);
      } else {
        setGeneralError("Não foi possível salvar o cliente.");
      }
    }
  });

  useEffect(() => {
    if (!client.data) return;
    form.reset({
      type: client.data.type,
      name: client.data.name,
      document: client.data.document ?? "",
      rg: client.data.rg ?? "",
      email: client.data.email ?? "",
      phone: client.data.phone ?? "",
      address: client.data.address ?? "",
      street: client.data.street ?? "",
      city: client.data.city ?? "",
      state: client.data.state ?? "",
      zipCode: client.data.zipCode ?? "",
      notes: client.data.notes ?? ""
    });
  }, [client.data, form]);

  const cepMutation = useMutation({
    mutationFn: async (zipCode: string) => {
      const digits = zipCode.replace(/\D/g, "");
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) throw new Error("CEP inválido.");
      const data = await response.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string; cep?: string };
      if (data.erro) throw new Error("CEP não encontrado.");
      return data;
    },
    onSuccess: (data) => {
      setCepFeedback("Endereço preenchido pelo CEP.");
      form.setValue("street", data.logradouro ?? "", { shouldDirty: true });
      form.setValue("city", data.localidade ?? "", { shouldDirty: true });
      form.setValue("state", data.uf ?? "", { shouldDirty: true });
      form.setValue("zipCode", data.cep?.replace(/\D/g, "") ?? watchedZipCode.replace(/\D/g, ""), { shouldDirty: true });
      if (data.bairro && !form.getValues("address")) form.setValue("address", data.bairro, { shouldDirty: true });
    },
    onError: (failure) => {
      setCepFeedback(failure instanceof Error ? failure.message : "Não foi possível buscar o CEP.");
    }
  });

  const submit = (data: ClientFormData) => {
    setGeneralError("");
    mutation.mutate(data);
  };

  const searchCep = () => {
    setCepFeedback("");
    const digits = watchedZipCode.replace(/\D/g, "");
    if (digits.length !== 8) {
      form.setError("zipCode", { message: "CEP deve ter 8 dígitos" });
      return;
    }
    cepMutation.mutate(digits);
  };

  if (isEdit && client.isLoading) return <LoadingState label="Carregando cliente" />;

  return (
    <>
      <header className="page-header form-header">
        <span>Clientes</span>
        <h1>{isEdit ? "Editar cliente" : "Novo cliente"}</h1>
      </header>

      <form className="form" onSubmit={form.handleSubmit(submit)}>
        {generalError ? <p className="alert">{generalError}</p> : null}

        <fieldset className="form-section">
          <legend>Dados principais</legend>
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select id="type" {...form.register("type")}>
              <option value="individual">Pessoa física</option>
              <option value="company">Pessoa jurídica</option>
            </Select>
            <FieldError message={form.formState.errors.type?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">{watchedType === "individual" ? "Nome completo" : "Razão social"}</Label>
            <Input id="name" {...form.register("name")} />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="document">CPF/CNPJ</Label>
            <Input id="document" {...form.register("document")} />
            <FieldError message={form.formState.errors.document?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rg">RG</Label>
            <Input id="rg" {...form.register("rg")} />
            <FieldError message={form.formState.errors.rg?.message} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Contato</legend>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...form.register("phone")} />
            <FieldError message={form.formState.errors.phone?.message} />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Endereço</legend>
          <div className="grid gap-2">
            <Label htmlFor="zipCode">CEP</Label>
            <div className="input-action">
              <Input id="zipCode" {...form.register("zipCode")} />
              <Button variant="outline" type="button" onClick={searchCep} disabled={cepMutation.isPending}>
                {cepMutation.isPending ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                Buscar
              </Button>
            </div>
            <FieldError message={form.formState.errors.zipCode?.message} />
          </div>
          <div className="grid gap-2 form-span-2">
            <Label htmlFor="street">Rua</Label>
            <Input id="street" {...form.register("street")} />
            <FieldError message={form.formState.errors.street?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" {...form.register("city")} />
            <FieldError message={form.formState.errors.city?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">Estado</Label>
            <Input id="state" maxLength={2} {...form.register("state")} />
            <FieldError message={form.formState.errors.state?.message} />
          </div>
          <div className="grid gap-2 form-span-2">
            <Label htmlFor="address">Complemento/Bairro</Label>
            <Textarea id="address" rows={3} {...form.register("address")} />
            <FieldError message={form.formState.errors.address?.message} />
          </div>
          {cepFeedback ? <p className={cepMutation.isError ? "alert" : "alert success"}>{cepFeedback}</p> : null}
        </fieldset>

        <fieldset className="form-section">
          <legend>Observações</legend>
          <div className="grid gap-2 form-span-4">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={5} {...form.register("notes")} />
            <FieldError message={form.formState.errors.notes?.message} />
          </div>
        </fieldset>

        <div className="actions">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 size={18} className="spin" /> : null}
            Salvar
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate(isEdit ? `/clients/${clientId}` : "/clients")}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
};
