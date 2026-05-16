import { zodResolver } from "@hookform/resolvers/zod";
import { clientFormSchema, type ClientFormData } from "@jurisflow/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Button } from "../../../components/ui/button.js";
import { Input } from "../../../components/ui/input.js";
import { Label } from "../../../components/ui/label.js";
import { Select } from "../../../components/ui/select.js";
import { Textarea } from "../../../components/ui/textarea.js";
import { createClient, getClient, updateClient } from "../../../services/clients.js";
import { ApiError } from "../../../services/http.js";
import { FieldError } from "./FieldError.js";
import { emptyClientForm } from "./utils/clientFormDefaults.js";

type ClientFormProps = {
  clientId?: string;
  mode: "create" | "update";
};

export const ClientForm = ({ clientId, mode }: ClientFormProps) => {
  const isEdit = mode === "update";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generalError, setGeneralError] = useState("");
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientForm
  });
  const watchedType = form.watch("type");

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
        setGeneralError(Object.keys(error.fieldErrors).length ? "" : error.message);
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
      email: client.data.email ?? "",
      phone: client.data.phone ?? "",
      address: client.data.address ?? "",
      notes: client.data.notes ?? ""
    });
  }, [client.data, form]);

  const submit = (data: ClientFormData) => {
    setGeneralError("");
    mutation.mutate(data);
  };

  if (isEdit && client.isLoading) return <p>Carregando cliente...</p>;

  return (
    <>
      <header className="page-header">
        <span>Clientes</span>
        <h1>{isEdit ? "Editar cliente" : "Novo cliente"}</h1>
      </header>

      <form className="form" onSubmit={form.handleSubmit(submit)}>
        {generalError ? <p className="alert">{generalError}</p> : null}

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
          <Label htmlFor="document">Documento</Label>
          <Input id="document" {...form.register("document")} />
          <FieldError message={form.formState.errors.document?.message} />
        </div>

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

        <div className="grid gap-2">
          <Label htmlFor="address">Endereço</Label>
          <Textarea id="address" rows={3} {...form.register("address")} />
          <FieldError message={form.formState.errors.address?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" rows={5} {...form.register("notes")} />
          <FieldError message={form.formState.errors.notes?.message} />
        </div>

        <div className="actions">
          <Button type="submit" disabled={mutation.isPending}>
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
