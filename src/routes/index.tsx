import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cronos Pricing Insights — Análise de Cotações" },
      {
        name: "description",
        content:
          "Plataforma corporativa de inteligência de Pricing para análise de cotações de transporte internacional.",
      },
      { property: "og:title", content: "Cronos Pricing Insights — Análise de Cotações" },
      {
        property: "og:description",
        content:
          "Inteligência e acompanhamento de Pricing: ofertas, rotas, clientes, coloaders e analistas.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    void navigate({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-64 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}
