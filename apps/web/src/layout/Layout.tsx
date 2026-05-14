import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { appModules } from "../utils/appModules.js";

export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <strong>JurisFlow</strong>
        <nav>
          {appModules.map((module) =>
            module.path === "#" ? (
              <a href="#" key={module.name}>
                <module.icon size={18} />
                {module.name}
              </a>
            ) : (
              <NavLink to={module.path} key={module.name}>
                <module.icon size={18} />
                {module.name}
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <section className="workspace">{children}</section>
    </main>
  );
};
