import { useParams } from "react-router";
import { ClientForm } from "./form/ClientForm.js";

export const UpdateClientPage = () => {
  const { id } = useParams();

  return <ClientForm clientId={id} mode="update" />;
};
