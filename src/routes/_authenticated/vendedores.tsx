import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/vendedores")({
  head: () => ({
    meta: [
      { title: "Vendedores — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Desempenho comercial por vendedor e inside sales: solicitações, conversão e carteira.",
      },
      { property: "og:title", content: "Vendedores — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Conversão comercial por vendedor e responsável de inside sales.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Pessoas"
      title="Desempenho comercial"
      description="Visão por vendedor e responsável comercial/inside sales: solicitações de cotação, taxa de aprovação, carteira de clientes atendida e principais motivos de perda."
      filters={["Vendedor", "Período", "Cliente", "Rota"]}
      kpis={["Vendedores ativos", "Solicitações", "Aprovadas", "Conversão"]}
      chartTitle="Solicitações por período"
      chartDescription="Volume solicitado e convertido por vendedor."
      tableTitle="Ranking comercial"
      tableDescription="Volume, conversão e carteira atendida."
      tableColumns={["Vendedor", "Solicitações", "Aprovadas", "Conversão", "Clientes"]}
    />
  ),
});
