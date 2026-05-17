import { useParams } from "react-router";
import { CaseForm } from "src/features/cases/form/CaseForm.js";

export const CreateCasePage = () => {
  const { clientId = "" } = useParams();

  if (!clientId) return <p className="alert">Cliente não informado.</p>;

  return <CaseForm mode="create" clientId={clientId} />;
};
