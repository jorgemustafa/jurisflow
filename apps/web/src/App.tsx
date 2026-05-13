import { BriefcaseBusiness, CircleDollarSign, FileText, Users } from "lucide-react";

const modules = [
  { name: "Clientes", description: "Cadastro central de pessoas físicas e jurídicas.", icon: Users },
  { name: "Processos", description: "Casos, prazos, responsáveis e histórico jurídico.", icon: BriefcaseBusiness },
  { name: "Financeiro", description: "Honorários, vencimentos, recebimentos e inadimplência.", icon: CircleDollarSign },
  { name: "Documentos", description: "Arquivos vinculados a clientes e processos.", icon: FileText }
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <strong>JurisFlow</strong>
        <nav>
          {modules.map((module) => (
            <a href="#" key={module.name}>
              <module.icon size={18} />
              {module.name}
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header>
          <span>Escritório jurídico</span>
          <h1>Operação centralizada</h1>
          <p>Base inicial para centralizar fluxos de clientes, processos, financeiro e documentos.</p>
        </header>

        <div className="module-grid">
          {modules.map((module) => (
            <article className="module-card" key={module.name}>
              <module.icon size={22} />
              <h2>{module.name}</h2>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
