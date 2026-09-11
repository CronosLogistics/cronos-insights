import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  head: () => ({
    meta: [
      { title: "Cotações — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Carteira de cotações e ofertas: status, revisões, validade, incoterm e cotações em análise.",
      },
      { property: "og:title", content: "Cotações — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Acompanhamento da carteira de ofertas de Pricing.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Carteira"
      title="Cotações e ofertas"
      description="Base analítica de ofertas por cliente, rota, modalidade e incoterm, com status de aprovação, revisões, validade e responsáveis. Estrutura preparada para detalhamento por linha de oferta."
      filters={["Período", "Status", "Modalidade", "Cliente", "Analista"]}
      kpis={["Ofertas", "Linhas de cotação", "Em análise", "Conversão"]}
      chartTitle="Ofertas por status ao longo do tempo"
      chartDescription="Distribuição mensal entre aprovadas, reprovadas e em análise."
      tableTitle="Base de ofertas"
      tableDescription="Visão detalhada por oferta e revisão."
      tableColumns={[
        "Oferta",
        "Cliente",
        "Rota",
        "Modalidade",
        "Container",
        "Status",
        "Analista",
        "Abertura",
      ]}
    />
  ),
});
