import { useParams } from "react-router";
import { CaseForm } from "src/features/cases/form/CaseForm.js";

export const UpdateCasePage = () => {
  const { id = "" } = useParams();

  if (!id) return <p className="alert">Processo não informado.</p>;

  return <CaseForm mode="update" caseId={id} />;
};
