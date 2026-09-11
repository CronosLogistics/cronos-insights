import { createFileRoute } from "@tanstack/react-router";

import { ModulePage } from "@/components/layout/ModulePage";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha de inteligência do cliente: recorrência de cotações, aprovações, reprovações e rotas preferidas.",
      },
      { property: "og:title", content: "Clientes — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Comportamento de cotação e decisão por cliente.",
      },
    ],
  }),
  component: () => (
    <ModulePage
      eyebrow="Inteligência"
      title="Ficha de inteligência do cliente"
      description="Perfil analítico do cliente: frequência de solicitações, taxa de aprovação, rotas e coloaders mais utilizados, motivos de perda recorrentes e sinalizações de risco comercial."
      filters={["Cliente", "Período", "Rota", "Modalidade"]}
      kpis={["Clientes ativos", "Ofertas do cliente", "Conversão", "Ticket de decisão"]}
      chartTitle="Histórico de cotações do cliente"
      chartDescription="Evolução de solicitações e decisões por mês."
      tableTitle="Carteira de clientes"
      tableDescription="Ranking por volume de cotações e conversão."
      tableColumns={["Cliente", "Ofertas", "Aprovadas", "Reprovadas", "Conversão", "Última cotação"]}
    />
  ),
});
