import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  FileStack,
  Percent,
  Ship,
  TrendingDown,
  XCircle,
} from "lucide-react";

import {
  ChartSkeleton,
  DonutSkeleton,
  FilterBarSkeleton,
  KpiCardSkeleton,
  PanelBlock,
  TableSkeleton,
} from "@/components/data/Placeholders";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard de Pricing — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Visão geral de ofertas, conversão, cotações em análise e desempenho por rota, cliente e coloader.",
      },
      { property: "og:title", content: "Dashboard de Pricing — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Painel executivo da análise de cotações de Pricing.",
      },
    ],
  }),
  component: DashboardPage,
});

const kpis = [
  { label: "Ofertas no período", icon: FileStack },
  { label: "Taxa de conversão", icon: Percent },
  { label: "Aprovadas", icon: CheckCircle2 },
  { label: "Reprovadas", icon: XCircle },
  { label: "Em análise", icon: Clock },
  { label: "Tempo médio de decisão", icon: Clock },
  { label: "Rotas ativas", icon: Ship },
  { label: "Principal motivo de perda", icon: TrendingDown },
];

function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="panel grid-fade relative overflow-hidden p-6 lg:p-8">
        <div className="relative max-w-2xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Visão geral do período
          </p>
          <h2 className="text-2xl font-semibold lg:text-3xl">
            Cronos Pricing Insights
          </h2>
          <p className="text-sm text-muted-foreground">
            Painel de inteligência de Pricing para acompanhamento de cotações, decisões comerciais e
            desempenho por rota, cliente, coloader, agente, vendedor e analista. Esta versão
            apresenta a estrutura visual — os indicadores serão conectados nas próximas etapas.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">Marítimo</Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Aéreo (futuro)
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Rodoviário (futuro)
            </Badge>
          </div>
        </div>
      </section>

      <FilterBarSkeleton
        filters={["Data inicial", "Data final", "Modalidade", "Cliente", "Rota", "Status"]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCardSkeleton key={kpi.label} label={kpi.label} icon={kpi.icon} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PanelBlock
          className="xl:col-span-2"
          title="Evolução de ofertas e conversão"
          description="Série mensal de ofertas abertas, decididas e taxa de aprovação."
          action={
            <Tabs defaultValue="mes">
              <TabsList>
                <TabsTrigger value="mes" disabled>
                  Mês
                </TabsTrigger>
                <TabsTrigger value="semana" disabled>
                  Semana
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <ChartSkeleton />
        </PanelBlock>

        <PanelBlock
          title="Composição das decisões"
          description="Aprovadas, reprovadas e em análise no período."
          action={<Badge variant="secondary">Em construção</Badge>}
        >
          <DonutSkeleton />
        </PanelBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PanelBlock
          title="Rotas com maior volume"
          description="Origem, destino e desempenho de conversão."
          action={<Badge variant="secondary">Em construção</Badge>}
        >
          <TableSkeleton columns={["Rota", "Ofertas", "Aprovadas", "Conversão"]} rows={5} />
        </PanelBlock>

        <PanelBlock
          title="Coloaders / armadores em destaque"
          description="Participação nas ofertas e taxa de aprovação."
          action={<Badge variant="secondary">Em construção</Badge>}
        >
          <TableSkeleton columns={["Coloader", "Ofertas", "Aprovadas", "Conversão"]} rows={5} />
        </PanelBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PanelBlock
          className="xl:col-span-2"
          title="Cotações em análise"
          description="Ofertas aguardando decisão, por faixa de atenção e dias em aberto."
          action={<Badge variant="secondary">Em construção</Badge>}
        >
          <TableSkeleton
            columns={["Oferta", "Cliente", "Rota", "Analista", "Dias em aberto", "Atenção"]}
            rows={6}
          />
        </PanelBlock>

        <PanelBlock
          title="Motivos de reprovação"
          description="Ranking dos motivos declarados nas perdas."
          action={<Badge variant="secondary">Em construção</Badge>}
        >
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </PanelBlock>
      </div>
    </div>
  );
}
