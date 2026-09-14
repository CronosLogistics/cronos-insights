import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";

import { KpiCard } from "@/components/data/KpiCard";
import { PanelBlock } from "@/components/data/Placeholders";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataHora, useKpisGerais, useUltimaImportacao } from "@/lib/analytics";
import { usePerfil } from "@/hooks/useProduto";

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

const dadosReais = (
  <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
    <Database className="size-3" />
    Dados reais
  </Badge>
);

function mesLabel(mesAno: number | null) {
  if (!mesAno) return "—";
  const texto = String(mesAno);
  if (texto.length === 6) return `${texto.slice(4, 6)}/${texto.slice(0, 4)}`;
  return texto;
}

function DashboardPage() {
  const kpis = useKpisGerais();
  const importacao = useUltimaImportacao();
  const perfil = usePerfil();

  const mensal = useQuery({
    queryKey: ["ofertas-mensal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_ofertas_mensal")
        .select("*")
        .order("mes_ano", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []).slice().reverse();
    },
  });

  const rotas = useQuery({
    queryKey: ["dash-rotas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_rotas")
        .select("rota,ofertas,aprovadas,conversao_pct")
        .order("ofertas", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const coloaders = useQuery({
    queryKey: ["dash-coloaders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_coloaders")
        .select("coloader,ofertas,aprovadas,conversao_pct")
        .order("ofertas", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const emAnalise = useQuery({
    queryKey: ["dash-em-analise"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_cotacoes_em_analise")
        .select("oferta,cliente,rota,pricing,dias_em_aberto,faixa_atencao")
        .order("dias_em_aberto", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const motivos = useQuery({
    queryKey: ["dash-motivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_motivos_perda")
        .select("motivo,reprovacoes,participacao_pct")
        .order("reprovacoes", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const maiorMes = Math.max(...(mensal.data ?? []).map((item) => Number(item.ofertas ?? 0)), 1);
  const maiorMotivo = Math.max(
    ...(motivos.data ?? []).map((item) => Number(item.reprovacoes ?? 0)),
    1,
  );

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden p-6 lg:p-8">
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative max-w-2xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Visão geral da base de ofertas
          </p>
          <h2 className="text-2xl font-semibold lg:text-3xl">Cronos Pricing Insights</h2>
          <p className="text-sm text-muted-foreground">
            Indicadores calculados sobre o relatório corporativo de Ofertas mantido no OneDrive.
            Período coberto:{" "}
            {kpis.data?.primeira_abertura
              ? `${kpis.data.primeira_abertura.split("-").reverse().join("/")} a ${kpis.data.ultima_abertura?.split("-").reverse().join("/")}`
              : "—"}
            . Última carga: {formatarDataHora(importacao.data?.concluido_em)}.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">
              Produto: {perfil.data?.produtoNome ?? "não definido"}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Filtro obrigatório do usuário
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ofertas e revisões"
          value={kpis.isPending ? "…" : (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR")}
          hint="Registros na base"
        />
        <KpiCard
          label="Taxa de conversão"
          value={kpis.isPending ? "…" : `${(kpis.data?.conversao_pct ?? 0).toLocaleString("pt-BR")}%`}
          hint="Aprovadas sobre decididas"
        />
        <KpiCard
          label="Aprovadas"
          value={kpis.isPending ? "…" : (kpis.data?.aprovadas ?? 0).toLocaleString("pt-BR")}
          hint="Decisões favoráveis"
        />
        <KpiCard
          label="Reprovadas"
          value={kpis.isPending ? "…" : (kpis.data?.reprovadas ?? 0).toLocaleString("pt-BR")}
          hint="Perdas registradas"
        />
        <KpiCard
          label="Em aberto"
          value={kpis.isPending ? "…" : (kpis.data?.em_aberto ?? 0).toLocaleString("pt-BR")}
          hint="Sem decisão registrada"
        />
        <KpiCard
          label="Tempo médio de resposta"
          value={
            kpis.isPending ? "…" : `${(kpis.data?.tempo_medio_horas ?? 0).toLocaleString("pt-BR")} h`
          }
          hint="Pricing"
        />
        <KpiCard
          label="Rotas ativas"
          value={kpis.isPending ? "…" : (kpis.data?.rotas ?? 0).toLocaleString("pt-BR")}
          hint="Combinações origem/destino"
        />
        <KpiCard
          label="Clientes atendidos"
          value={kpis.isPending ? "…" : (kpis.data?.clientes ?? 0).toLocaleString("pt-BR")}
          hint="Clientes com cotação"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PanelBlock
          className="xl:col-span-2"
          title="Evolução de ofertas e conversão"
          description="Últimos doze meses com registro no relatório."
          action={dadosReais}
        >
          {mensal.isPending ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="flex h-56 items-stretch gap-2">
              {(mensal.data ?? []).map((item) => (
                <div key={item.mes_ano} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {Number(item.conversao_pct ?? 0).toLocaleString("pt-BR")}%
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="gradient-cronos w-full rounded-t-md"
                      style={{
                        height: `${Math.max((Number(item.ofertas ?? 0) / maiorMes) * 100, 3)}%`,
                      }}
                      title={`${Number(item.ofertas ?? 0).toLocaleString("pt-BR")} ofertas`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {mesLabel(item.mes_ano)}
                  </span>
                </div>
              ))}
            </div>

          )}
        </PanelBlock>

        <PanelBlock
          title="Composição das decisões"
          description="Participação de aprovadas, reprovadas e em aberto."
          action={dadosReais}
        >
          {kpis.isPending ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="space-y-4 pt-2">
              {[
                { label: "Aprovadas", valor: Number(kpis.data?.aprovadas ?? 0) },
                { label: "Reprovadas", valor: Number(kpis.data?.reprovadas ?? 0) },
                { label: "Em aberto", valor: Number(kpis.data?.em_aberto ?? 0) },
              ].map((item) => {
                const total = Number(kpis.data?.ofertas ?? 1);
                const pct = (item.valor / total) * 100;
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">
                        {item.valor.toLocaleString("pt-BR")} ·{" "}
                        {pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="gradient-cronos h-full rounded-full"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PanelBlock
          title="Rotas com maior volume"
          description="Origem, destino e desempenho de conversão."
          action={dadosReais}
        >
          {rotas.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rota</TableHead>
                  <TableHead className="text-right">Ofertas</TableHead>
                  <TableHead className="text-right">Aprovadas</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rotas.data ?? []).map((item) => (
                  <TableRow key={item.rota}>
                    <TableCell className="max-w-[220px] truncate">{item.rota}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.ofertas ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.aprovadas ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.conversao_pct ?? 0).toLocaleString("pt-BR")}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </PanelBlock>

        <PanelBlock
          title="Coloaders / armadores em destaque"
          description="Participação nas ofertas e taxa de aprovação."
          action={dadosReais}
        >
          {coloaders.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coloader</TableHead>
                  <TableHead className="text-right">Ofertas</TableHead>
                  <TableHead className="text-right">Aprovadas</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(coloaders.data ?? []).map((item) => (
                  <TableRow key={item.coloader}>
                    <TableCell className="max-w-[220px] truncate">{item.coloader}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.ofertas ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.aprovadas ?? 0).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.conversao_pct ?? 0).toLocaleString("pt-BR")}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </PanelBlock>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PanelBlock
          className="xl:col-span-2"
          title="Cotações em análise"
          description="Ofertas sem decisão, ordenadas por dias em aberto."
          action={dadosReais}
        >
          {emAnalise.isPending ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oferta</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Analista</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead>Atenção</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(emAnalise.data ?? []).map((item) => (
                    <TableRow key={item.oferta}>
                      <TableCell className="whitespace-nowrap font-medium">{item.oferta}</TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {item.cliente ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{item.rota ?? "—"}</TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {item.pricing ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">{item.dias_em_aberto ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.faixa_atencao === "Crítica" ? "destructive" : "secondary"}
                          className="font-normal"
                        >
                          {item.faixa_atencao}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </PanelBlock>

        <PanelBlock
          title="Motivos de reprovação"
          description="Ranking dos motivos declarados nas perdas."
          action={dadosReais}
        >
          {motivos.isPending ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="space-y-4">
              {(motivos.data ?? []).map((item) => (
                <div key={item.motivo} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-muted-foreground">{item.motivo}</span>
                    <span className="font-medium">
                      {Number(item.participacao_pct ?? 0).toLocaleString("pt-BR")}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="gradient-cronos h-full rounded-full"
                      style={{
                        width: `${Math.max((Number(item.reprovacoes ?? 0) / maiorMotivo) * 100, 2)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelBlock>
      </div>
    </div>
  );
}
