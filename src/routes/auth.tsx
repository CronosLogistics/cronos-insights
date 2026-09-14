import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import authBg from "@/assets/auth-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AuthSearch = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next: typeof search["next"] === "string" ? search["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Acesso — Cronos Pricing Insights" },
      {
        name: "description",
        content: "Entre na plataforma de inteligência de Pricing Cronos com seu e-mail corporativo.",
      },
      { property: "og:title", content: "Acesso — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Área restrita da plataforma de análise de cotações e inteligência de Pricing.",
      },
    ],
  }),
  component: AuthPage,
});

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: safeNext(next), replace: true });
    }
  }, [loading, session, navigate, next]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    void navigate({ to: safeNext(next), replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="surface-vinho relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <img
          src={authBg}
          alt=""
          aria-hidden
          width={1280}
          height={1600}
          className="absolute inset-0 size-full object-cover opacity-45"
        />
        <div className="relative flex items-center gap-3">
          <span className="gradient-cronos flex size-11 items-center justify-center rounded-xl shadow-glow">
            <Activity className="size-5 text-primary-foreground" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">Cronos Pricing Insights</span>
            <span className="block text-[11px] uppercase tracking-[0.2em] opacity-70">
              Análise de Cotações
            </span>
          </span>
        </div>

        <div className="relative max-w-md space-y-4">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Inteligência de Pricing para cada oferta, rota e decisão.
          </h2>
          <p className="text-sm opacity-75">
            Centralize ofertas, aprovações e reprovações, e acompanhe o desempenho de clientes,
            rotas, coloaders, agentes e analistas em uma única plataforma.
          </p>
          <ul className="space-y-2 text-sm opacity-75">
            <li>Conversão e tempo de resposta por dimensão</li>
            <li>Motivos de perda e qualidade da base</li>
            <li>Arquitetura preparada para operação multimodal</li>
          </ul>
        </div>

        <p className="relative text-[11px] uppercase tracking-[0.2em] opacity-50">
          Ambiente corporativo · acesso restrito
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <LockKeyhole className="size-3" />
              Acesso seguro
            </span>
            <h1 className="text-2xl font-semibold">Entrar na plataforma</h1>
            <p className="text-sm text-muted-foreground">
              Use seu e-mail corporativo e senha para acessar a análise de cotações.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
