import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/coloaders")({
  head: () => ({
    meta: [
      { title: "Coloaders e Armadores — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha do coloader/armador: participação nas ofertas, conversão por rota e competitividade.",
      },
      { property: "og:title", content: "Coloaders e Armadores — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Desempenho de coloaders e armadores nas cotações de Pricing.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Inteligência"
      title="Ficha do coloader / armador"
      description="Avaliação dos parceiros de transporte: participação nas ofertas, taxa de aprovação por rota, aderência de validade e competitividade relativa frente às alternativas cotadas."
      filters={["Coloader / Armador", "Rota", "Período", "Modalidade"]}
      kpis={["Parceiros cotados", "Ofertas atribuídas", "Conversão", "Rotas atendidas"]}
      chartTitle="Participação por período"
      chartDescription="Volume de ofertas e decisões por parceiro."
      tableTitle="Ranking de coloaders"
      tableDescription="Comparativo por volume, conversão e cobertura de rotas."
      tableColumns={["Coloader / Armador", "Ofertas", "Aprovadas", "Conversão", "Rotas"]}
    />
  ),
});
