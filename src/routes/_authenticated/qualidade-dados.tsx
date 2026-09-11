import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/qualidade-dados")({
  head: () => ({
    meta: [
      { title: "Qualidade de Dados — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Consistência da base de cotações: campos não informados, duplicidades e padronização de portos.",
      },
      { property: "og:title", content: "Qualidade de Dados — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Monitoramento da confiabilidade da base analítica de Pricing.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Diagnóstico"
      title="Qualidade dos dados"
      description="Monitoramento da confiabilidade da base: registros sem cliente, rota, coloader ou analista, inconsistências de datas e validade, duplicidades de oferta e padronização de nomes de portos."
      filters={["Período", "Origem do dado", "Tipo de inconsistência"]}
      kpis={["Registros analisados", "Campos não informados", "Duplicidades", "Índice de qualidade"]}
      chartTitle="Evolução da qualidade"
      chartDescription="Percentual de registros consistentes por período de carga."
      tableTitle="Inconsistências identificadas"
      tableDescription="Lista das verificações e volumes afetados."
      tableColumns={["Verificação", "Registros afetados", "Participação", "Severidade"]}
    />
  ),
});
