import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { usePerfil } from "@/hooks/useProduto";
import { navigation } from "@/lib/navigation";

/** Sem modalidade liberada (ou com acesso inativo) o banco não libera nenhuma oferta. */
function SemProdutoAviso() {
  const perfil = usePerfil();
  if (perfil.isPending) return null;

  if (perfil.data && !perfil.data.ativo) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <p className="font-medium">Seu acesso está inativo</p>
        <p className="text-muted-foreground">
          Procure um administrador para reativar seu acesso. Enquanto isso, nenhuma oferta é
          exibida nas telas.
        </p>
      </div>
    );
  }

  if ((perfil.data?.modalidadesCodigos ?? []).length > 0) return null;

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
      <p className="font-medium">Nenhuma modalidade liberada para o seu acesso</p>
      <p className="text-muted-foreground">
        Enquanto um administrador não definir suas modalidades no cadastro de usuários, nenhuma
        oferta será exibida nas telas.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/auth", search: { next: pathname }, replace: true });
    }
  }, [loading, session, navigate, pathname]);

  const current = navigation
    .flatMap((group) => group.items.flatMap((item) => [item, ...(item.children ?? [])]))
    .filter((item): item is typeof item & { to: string } => Boolean(item.to))
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-64 space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          title={current?.label ?? "Cronos Pricing Insights"}
          subtitle={current?.description ?? "Análise de Cotações"}
        />
        <main className="min-w-0 w-full flex-1 space-y-4 px-4 py-6 lg:px-8 lg:py-8">
          <SemProdutoAviso />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
