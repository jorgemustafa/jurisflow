import { Link } from "react-router";
import { appModules } from "src/utils/appModules.js";

export const DashboardPage = () => {
  return (
    <>
      <header className="page-header">
        <span>Escritório jurídico</span>
        <h1>Operação centralizada</h1>
        <p>Base inicial para centralizar fluxos de clientes, processos, financeiro e documentos.</p>
      </header>

      <div className="module-grid">
        {appModules.map((module) => (
          <Link className="module-card" to={module.path === "#" ? "/" : module.path} key={module.name}>
            <module.icon size={22} />
            <h2>{module.name}</h2>
          </Link>
        ))}
      </div>
    </>
  );
};
