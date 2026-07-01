import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Scale } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "src/components/ui/button.js";
import { Input } from "src/components/ui/input.js";
import { Label } from "src/components/ui/label.js";
import { ApiError } from "src/services/http.js";
import { login, type LoginInput } from "src/services/auth.js";
import { FieldError } from "src/features/clients/form/FieldError.js";
import { useAuth } from "src/features/auth/AuthContext.js";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Informe ao menos 8 caracteres")
});

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <section className="auth-showcase" aria-hidden="true">
        <div className="auth-showcase-content">
          <div className="auth-brand">
            <span className="auth-brand-mark">
              <Scale size={24} />
            </span>
            <strong>JurisFlow</strong>
          </div>
          <h2>Sua operação jurídica em um só lugar.</h2>
          <p>Organize processos, clientes, prazos e finanças com clareza e segurança.</p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand auth-brand-mobile">
            <span className="auth-brand-mark">
              <Scale size={22} />
            </span>
            <strong>JurisFlow</strong>
          </div>

          <header className="auth-header">
            <span>Área segura</span>
            <h1>Bem-vindo de volta</h1>
            <p>Entre com seus dados para acessar sua área de trabalho.</p>
          </header>

          <form className="auth-form" onSubmit={form.handleSubmit(submit)}>
            {error ? (
              <p className="alert auth-alert" role="alert">
                {error}
              </p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@escritorio.com.br"
                {...form.register("email")}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <div className="password-field">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-11"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              <FieldError message={form.formState.errors.password?.message} />
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              <LogIn size={18} />
              {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
