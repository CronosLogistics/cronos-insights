import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Inteligência de agentes: participação nas cotações, efetividade e cobertura por origem.",
      },
      { property: "og:title", content: "Agentes — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Efetividade dos agentes no processo de cotação.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Inteligência"
      title="Inteligência de agentes"
      description="Participação dos agentes no exterior nas cotações: volume apresentado, taxa de conversão, cobertura por origem e contribuição para as decisões aprovadas."
      filters={["Agente", "País de origem", "Período", "Rota"]}
      kpis={["Agentes envolvidos", "Ofertas via agente", "Conversão", "Origens cobertas"]}
      chartTitle="Volume por agente"
      chartDescription="Comparativo de ofertas apresentadas por período."
      tableTitle="Ranking de agentes"
      tableDescription="Volume, conversão e cobertura geográfica."
      tableColumns={["Agente", "Ofertas", "Aprovadas", "Conversão", "Origens"]}
    />
  ),
});
