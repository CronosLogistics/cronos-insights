import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";

import { KpiCard } from "@/components/data/KpiCard";
import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, usePaginacao } from "@/components/data/TablePagination";
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
  component: QualidadePage,
});

function severidade(pct: number) {
  if (pct >= 98) return { label: "Ótimo", variant: "secondary" as const };
  if (pct >= 85) return { label: "Atenção", variant: "outline" as const };
  return { label: "Crítico", variant: "destructive" as const };
}

function QualidadePage() {
  const kpis = useKpisGerais();
  const importacao = useUltimaImportacao();

  const campos = useQuery({
    queryKey: ["qualidade-dados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_qualidade_dados")
        .select("*")
        .order("preenchimento_pct", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pior = campos.data?.[0];
  const media =
    campos.data && campos.data.length > 0
      ? campos.data.reduce((soma, item) => soma + Number(item.preenchimento_pct ?? 0), 0) /
        campos.data.length
      : 0;
  const paginacao = usePaginacao(campos.data, "qualidade-dados");

  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Diagnóstico"
        title="Qualidade dos dados"
        description="Confiabilidade da base importada do relatório de Ofertas: percentual de preenchimento de cada campo analítico, campos críticos e data da última carga."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Registros analisados"
          value={kpis.isPending ? "…" : (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR")}
          hint="Ofertas e revisões"
        />
        <KpiCard
          label="Campos monitorados"
          value={campos.isPending ? "…" : String(campos.data?.length ?? 0)}
          hint="Colunas do relatório"
        />
        <KpiCard
          label="Índice de preenchimento"
          value={campos.isPending ? "…" : `${media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          hint="Média dos campos monitorados"
        />
        <KpiCard
          label="Última carga"
          value={importacao.isPending ? "…" : formatarDataHora(importacao.data?.concluido_em)}
          hint={`Fonte: Ofertas.xlsx${importacao.data?.linhas ? ` · ${importacao.data.linhas.toLocaleString("pt-BR")} linhas` : ""}`}
        />
      </div>

      {pior ? (
        <PanelBlock
          title="Campo com menor preenchimento"
          description="Prioridade de correção na origem do relatório."
        >
          <p className="text-sm">
            <span className="font-medium">{pior.campo}</span> — preenchido em{" "}
            {Number(pior.preenchimento_pct ?? 0).toLocaleString("pt-BR")}% dos registros (
            {Number(pior.vazios ?? 0).toLocaleString("pt-BR")} sem informação).
          </p>
        </PanelBlock>
      ) : null}

      <PanelBlock
        title="Preenchimento por campo"
        description="Percentual de registros com informação em cada campo analítico."
        action={
          <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
            <Database className="size-3" />
            Dados reais
          </Badge>
        }
      >
        {campos.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead className="text-right">Preenchidos</TableHead>
                    <TableHead className="text-right">Sem informação</TableHead>
                    <TableHead className="text-right">Preenchimento</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginacao.visiveis.map((item) => {
                    const pct = Number(item.preenchimento_pct ?? 0);
                    const nivel = severidade(pct);
                    return (
                      <TableRow key={item.campo}>
                        <TableCell className="font-medium">{item.campo}</TableCell>
                        <TableCell className="text-right">
                          {Number(item.preenchidos ?? 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.vazios ?? 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {pct.toLocaleString("pt-BR")}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={nivel.variant} className="font-normal">
                            {nivel.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              pagina={paginacao.pagina}
              totalPaginas={paginacao.totalPaginas}
              porPagina={paginacao.porPagina}
              total={paginacao.total}
              inicio={paginacao.inicio}
              onPagina={paginacao.setPagina}
              onPorPagina={paginacao.setPorPagina}
            />
          </>
        )}
      </PanelBlock>
    </div>
  );
}
