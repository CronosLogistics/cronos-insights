import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/motivos-perda")({
  head: () => ({
    meta: [
      { title: "Motivos de Perda — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Inteligência de motivos de reprovação: ranking por motivo, cliente, rota e coloader.",
      },
      { property: "og:title", content: "Motivos de Perda — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Diagnóstico das reprovações de cotações de Pricing.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Diagnóstico"
      title="Inteligência de motivos de reprovação"
      description="Análise estruturada das perdas: motivo declarado, descrição complementar, concentração por cliente, rota e coloader, e evolução ao longo do tempo."
      filters={["Motivo", "Período", "Cliente", "Rota"]}
      kpis={["Reprovações", "Motivos distintos", "Motivo predominante", "Participação"]}
      chartTitle="Distribuição dos motivos"
      chartDescription="Participação relativa de cada motivo no período."
      tableTitle="Detalhamento por motivo"
      tableDescription="Volume e concentração por dimensão."
      tableColumns={["Motivo", "Reprovações", "Participação", "Cliente recorrente", "Rota recorrente"]}
    />
  ),
});
