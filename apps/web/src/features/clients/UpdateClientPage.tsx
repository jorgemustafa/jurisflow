import { useParams } from "react-router";
import { ClientForm } from "src/features/clients/form/ClientForm.js";

export const UpdateClientPage = () => {
  const { id } = useParams();

  return <ClientForm clientId={id} mode="update" />;
};
