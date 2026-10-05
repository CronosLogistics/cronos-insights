import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { usePerfil } from "@/hooks/useProduto";
import { trocarSenhaTemporaria } from "@/lib/usuarios-fn";

export const Route = createFileRoute("/definir-senha")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — Cronos Pricing Insights" },
      { name: "description", content: "Defina sua senha pessoal no primeiro acesso à plataforma Cronos Pricing Insights." },
      { property: "og:title", content: "Definir nova senha — Cronos Pricing Insights" },
      { property: "og:description", content: "Troca obrigatória da senha temporária no primeiro acesso." },
    ],
  }),
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const { session, loading } = useAuth();
  const perfil = usePerfil();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    if (perfil.data && !perfil.data.trocarSenha) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, perfil.data, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    if (novaSenha.length < 8) return setErro("A nova senha deve ter pelo menos 8 caracteres.");
    if (novaSenha !== confirmacao) return setErro("A confirmação deve ser igual à nova senha.");
    setEnviando(true);
    try {
      await trocarSenhaTemporaria({ data: { novaSenha, confirmacao } });
      setNovaSenha("");
      setConfirmacao("");
      toast.success("Senha definida com sucesso.", {
        description: "A partir de agora, utilize sua nova senha para acessar o sistema.",
      });
      await queryClient.invalidateQueries({ queryKey: ["perfil"] });
      void navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível definir a nova senha.");
    } finally {
      setEnviando(false);
    }
  }

  if (loading || !session || perfil.isPending || !perfil.data?.trocarSenha) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-64 space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-3">
          <span className="gradient-cronos flex size-10 items-center justify-center rounded-xl shadow-glow">
            <Activity className="size-5 text-primary-foreground" />
          </span>
          <span className="font-display text-base font-semibold">Cronos Pricing Insights</span>
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <KeyRound className="size-3" />
            Primeiro acesso
          </span>
          <h1 className="text-2xl font-semibold">Definir nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Por segurança, esta é sua primeira entrada no sistema. A senha fornecida pelo
            administrador é temporária. Defina uma nova senha para continuar.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input id="nova-senha" type="password" autoComplete="new-password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
            <Input id="confirmar-senha" type="password" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          </div>
          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Definir nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
