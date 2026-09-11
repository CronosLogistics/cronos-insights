import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/rotas")({
  head: () => ({
    meta: [
      { title: "Rotas — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha de inteligência da rota: países e portos de origem e destino, alternativas e conversão.",
      },
      { property: "og:title", content: "Rotas — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Inteligência de rotas por origem, destino e desempenho comercial.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Inteligência"
      title="Ficha de inteligência da rota"
      description="Análise por país e porto de origem e destino, com alternativas de rota, volume de ofertas, conversão e comportamento de preço. Preparada para operar com múltiplos modais."
      filters={["País de origem", "Porto de origem", "País de destino", "Porto de destino"]}
      kpis={["Rotas analisadas", "Ofertas na rota", "Conversão da rota", "Alternativas"]}
      chartTitle="Desempenho da rota no período"
      chartDescription="Volume de ofertas e decisões por mês."
      tableTitle="Ranking de rotas"
      tableDescription="Comparativo entre rotas por volume e conversão."
      tableColumns={["Rota", "Origem", "Destino", "Ofertas", "Aprovadas", "Conversão"]}
    />
  ),
});
