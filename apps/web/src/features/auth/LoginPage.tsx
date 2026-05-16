import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "../../components/ui/button.js";
import { Input } from "../../components/ui/input.js";
import { Label } from "../../components/ui/label.js";
import { ApiError } from "../../services/http.js";
import { login, type LoginInput } from "../../services/auth.js";
import { FieldError } from "../clients/form/FieldError.js";
import { useAuth } from "./AuthContext.js";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Informe ao menos 8 caracteres")
});

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  if (auth.isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (data: LoginInput) => {
    setError("");
    try {
      auth.saveSession(await login(data));
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.message);
      else setError("Não foi possível entrar.");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <header className="page-header">
          <span>JurisFlow</span>
          <h1>Entrar</h1>
          <p>Acesse sua área de trabalho.</p>
        </header>

        <form className="form" onSubmit={form.handleSubmit(submit)}>
          {error ? <p className="alert">{error}</p> : null}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
            <FieldError message={form.formState.errors.password?.message} />
          </div>

          <div className="actions">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              <LogIn size={18} />
              Entrar
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
