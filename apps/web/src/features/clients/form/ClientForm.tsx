import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ClientFormData, createClient, getClient, updateClient } from "../../../services/clients.js";
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
  const [form, setForm] = useState<ClientFormData>(emptyClientForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

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
        setFieldErrors(error.fieldErrors);
        setGeneralError(Object.keys(error.fieldErrors).length ? "" : error.message);
      } else {
        setGeneralError("Não foi possível salvar o cliente.");
      }
    }
  });

  useEffect(() => {
    if (!client.data) return;
    setForm({
      type: client.data.type,
      name: client.data.name,
      document: client.data.document ?? "",
      email: client.data.email ?? "",
      phone: client.data.phone ?? "",
      address: client.data.address ?? "",
      notes: client.data.notes ?? ""
    });
  }, [client.data]);

  const updateField = (field: keyof ClientFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError("");
    mutation.mutate(form);
  };

  if (isEdit && client.isLoading) return <p>Carregando cliente...</p>;

  return (
    <>
      <header className="page-header">
        <span>Clientes</span>
        <h1>{isEdit ? "Editar cliente" : "Novo cliente"}</h1>
      </header>

      <form className="form" onSubmit={submit}>
        {generalError ? <p className="alert">{generalError}</p> : null}

        <label>
          Tipo
          <select value={form.type} onChange={(event) => updateField("type", event.target.value as ClientFormData["type"])}>
            <option value="individual">Pessoa física</option>
            <option value="company">Pessoa jurídica</option>
          </select>
        </label>
        <FieldError message={fieldErrors.type} />

        <label>
          {form.type === "individual" ? "Nome completo" : "Razão social"}
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.name} />

        <label>
          Documento
          <input value={form.document} onChange={(event) => updateField("document", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.document} />

        <label>
          Email
          <input value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.email} />

        <label>
          Telefone
          <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
        </label>
        <FieldError message={fieldErrors.phone} />

        <label>
          Endereço
          <textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} rows={3} />
        </label>
        <FieldError message={fieldErrors.address} />

        <label>
          Observações
          <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={5} />
        </label>
        <FieldError message={fieldErrors.notes} />

        <div className="actions">
          <button className="button primary" type="submit" disabled={mutation.isPending}>
            Salvar
          </button>
          <button className="button" type="button" onClick={() => navigate(isEdit ? `/clients/${clientId}` : "/clients")}>
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
};
