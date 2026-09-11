import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/analistas")({
  head: () => ({
    meta: [
      { title: "Analistas de Pricing — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha do analista de Pricing: volume analisado, tempo de resposta e taxa de decisão.",
      },
      { property: "og:title", content: "Analistas de Pricing — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Produtividade e efetividade do time de Pricing.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Pessoas"
      title="Ficha do analista"
      description="Acompanhamento do time de Pricing: cotações analisadas, tempo médio até a decisão, distribuição entre aprovações e reprovações e concentração por rota ou cliente."
      filters={["Analista", "Período", "Rota", "Cliente"]}
      kpis={["Analistas ativos", "Cotações analisadas", "Tempo médio", "Conversão"]}
      chartTitle="Volume analisado por período"
      chartDescription="Cotações trabalhadas e decididas por analista."
      tableTitle="Desempenho por analista"
      tableDescription="Volume, tempo de resposta e resultado das análises."
      tableColumns={["Analista", "Cotações", "Decididas", "Em análise", "Tempo médio", "Conversão"]}
    />
  ),
});
