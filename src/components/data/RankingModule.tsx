import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";

import { KpiCard } from "@/components/data/KpiCard";
import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarValor, type Linha } from "@/lib/analytics";

export type Coluna = {
  key: string;
  label: string;
  tipo?: "texto" | "numero" | "pct" | "data" | "decimal";
};

export type KpiItem = { label: string; value: string; hint?: string };

/**
 * Módulo analítico padrão: indicadores, gráfico de barras do top 10 e
 * ranking tabular, todos alimentados pela base de ofertas.
 */
export function RankingModule({
  eyebrow,
  title,
  description,
  kpis,
  kpisCarregando,
  queryKey,
  fetchRows,
  colunas,
  campoRotulo,
  campoValor,
  buscaPlaceholder,
  chartTitle,
  chartDescription,
  tableTitle,
  tableDescription,
}: {
  eyebrow: string;
  title: string;
  description: string;
  kpis: KpiItem[];
  kpisCarregando?: boolean;
  queryKey: string;
  fetchRows: (busca: string) => Promise<Linha[]>;
  colunas: Coluna[];
  campoRotulo: string;
  campoValor: string;
  buscaPlaceholder: string;
  chartTitle: string;
  chartDescription: string;
  tableTitle: string;
  tableDescription: string;
}) {
  const [busca, setBusca] = useState("");
  const lista = useQuery({
    queryKey: [queryKey, busca],
    queryFn: () => fetchRows(busca.trim()),
  });

  const linhas = lista.data ?? [];
  const top = linhas.slice(0, 10);
  const maior = Math.max(...top.map((linha) => Number(linha[campoValor] ?? 0)), 1);

  return (
    <div className="space-y-6">
      <ModuleIntro eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpisCarregando ? "…" : kpi.value}
            {...(kpi.hint ? { hint: kpi.hint } : {})}
          />
        ))}
      </div>

      <PanelBlock
        title={chartTitle}
        description={chartDescription}
        action={
          <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
            <Database className="size-3" />
            Dados reais
          </Badge>
        }
      >
        {lista.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {top.map((linha) => {
              const valor = Number(linha[campoValor] ?? 0);
              return (
                <div key={String(linha[campoRotulo])} className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="truncate text-muted-foreground">
                      {formatarValor(linha[campoRotulo] ?? null)}
                    </span>
                    <span className="font-medium">{valor.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="gradient-cronos h-full rounded-full"
                      style={{ width: `${Math.max((valor / maior) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro para os filtros atuais.</p>
            ) : null}
          </div>
        )}
      </PanelBlock>

      <PanelBlock title={tableTitle} description={tableDescription}>
        <div className="space-y-4">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder={buscaPlaceholder}
            className="md:max-w-sm"
          />

          {lista.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : lista.isError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <RefreshCw className="size-4" />
              Não foi possível carregar os dados agora.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {colunas.map((coluna) => (
                      <TableHead
                        key={coluna.key}
                        className={coluna.tipo && coluna.tipo !== "texto" ? "text-right" : ""}
                      >
                        {coluna.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((linha, index) => (
                    <TableRow key={`${String(linha[campoRotulo])}-${index}`}>
                      {colunas.map((coluna) => (
                        <TableCell
                          key={coluna.key}
                          className={
                            coluna.tipo && coluna.tipo !== "texto"
                              ? "whitespace-nowrap text-right"
                              : "max-w-[260px] truncate"
                          }
                        >
                          {formatarValor(linha[coluna.key] ?? null, coluna.tipo ?? "texto")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {linhas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={colunas.length}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </PanelBlock>
    </div>
  );
}
