import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import authBg from "@/assets/auth-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProdutos } from "@/hooks/useProduto";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const [nome, setNome] = useState("");
  const [produto, setProduto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const produtos = useProdutos();

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

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    if (!produto) {
      toast.error("Selecione o produto", {
        description: "O produto define os dados que estarão disponíveis para o acesso.",
      });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome, produto_codigo: produto },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível criar o acesso", { description: error.message });
      return;
    }
    if (data.session) {
      void navigate({ to: safeNext(next), replace: true });
      return;
    }
    toast.success("Confirme seu e-mail", {
      description: "Enviamos um link de confirmação para concluir o cadastro.",
    });
  }

  async function handleGoogle() {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setSubmitting(false);
      toast.error("Falha no acesso com Google");
      return;
    }
    if (result.redirected) return;
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
              Use seu e-mail corporativo para acessar a análise de cotações.
            </p>
          </div>

          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar" className="pt-6">
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
            </TabsContent>

            <TabsContent value="criar" className="pt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome</Label>
                  <Input
                    id="signup-nome"
                    autoComplete="name"
                    required
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    placeholder="Nome e sobrenome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-produto">Produto</Label>
                  <Select value={produto} onValueChange={setProduto}>
                    <SelectTrigger id="signup-produto">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {(produtos.data ?? []).map((item) => (
                        <SelectItem key={item.codigo} value={item.codigo}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O produto define quais registros do relatório de Ofertas você poderá analisar.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Criar acesso
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={submitting}>
            Continuar com Google
          </Button>
        </div>
      </section>
    </div>
  );
}
