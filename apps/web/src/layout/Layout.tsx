import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { Button } from "src/components/ui/button.js";
import { useAuth } from "src/features/auth/AuthContext.js";
import { appModules } from "src/utils/appModules.js";

export const Layout = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const logout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar-brand">
          <strong>JurisFlow</strong>
          <span>{auth.session?.user.name}</span>
        </div>
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
        <Button className="sidebar-logout" variant="outline" type="button" onClick={logout}>
          <LogOut size={18} />
          Sair
        </Button>
      </aside>

      <section className="workspace">{children}</section>
    </main>
  );
};
