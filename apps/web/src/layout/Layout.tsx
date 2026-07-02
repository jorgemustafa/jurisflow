import type { ReactNode } from "react";
import { useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { Button } from "src/components/ui/button.js";
import { useAuth } from "src/features/auth/AuthContext.js";
import { TodoPanel } from "src/layout/TodoPanel.js";
import { appModules } from "src/utils/appModules.js";

export const Layout = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const logout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <strong>Magistrum</strong>
            <span>{auth.session?.user.name}</span>
          </div>
          <button
            aria-label={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!isSidebarCollapsed}
            className="sidebar-toggle"
            title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav>
          {appModules.map((module) =>
            module.path === "#" ? (
              <a href="#" key={module.name} title={isSidebarCollapsed ? module.name : undefined}>
                <module.icon size={18} />
                <span className="sidebar-link-label">{module.name}</span>
              </a>
            ) : (
              <NavLink to={module.path} key={module.name} title={isSidebarCollapsed ? module.name : undefined}>
                <module.icon size={18} />
                <span className="sidebar-link-label">{module.name}</span>
              </NavLink>
            )
          )}
        </nav>
        <Button className="sidebar-logout" title={isSidebarCollapsed ? "Sair" : undefined} variant="outline" type="button" onClick={logout}>
          <LogOut size={18} />
          <span>Sair</span>
        </Button>
      </aside>

      <section className="workspace">{children}</section>

      <TodoPanel />
    </main>
  );
};
