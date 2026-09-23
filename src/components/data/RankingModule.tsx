import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";

import { FiltroPeriodo } from "@/components/data/FiltroPeriodo";
import { KpiCard } from "@/components/data/KpiCard";
import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import { BotaoExportarTabela } from "@/components/data/table-export";
import {
  CabecalhoOrdenavel,
  useOrdenacaoTabela,
  type ColunasOrdenacao,
  type TipoOrdenacao,
} from "@/components/data/table-sort";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarValor, type Linha } from "@/lib/analytics";
import { gerarAnosOpcoes, type FiltroPeriodo as PeriodoFiltro } from "@/lib/filtro-periodo";

function tipoOrdenacaoColuna(tipo: Coluna["tipo"]): TipoOrdenacao {
  return tipo === "numero" || tipo === "pct" || tipo === "decimal" ? "numero" : "texto";
}

export type Coluna = {
  key: string;
  label: string;
  tipo?: "texto" | "numero" | "pct" | "data" | "decimal";
};

export type KpiItem = { label: string; value: string; hint?: string };

export type { PeriodoFiltro };

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
  fetchRows: (busca: string, periodo: PeriodoFiltro) => Promise<Linha[]>;
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
  const [anos, setAnos] = useState<number[]>([]);
  const [meses, setMeses] = useState<number[]>([]);
  const anosOpcoes = useMemo(() => gerarAnosOpcoes(), []);

  const lista = useQuery({
    queryKey: [queryKey, busca, anos, meses],
    queryFn: () =>
      fetchRows(busca.trim(), {
        anos,
        meses,
      }),
  });

  const linhas = lista.data;
  const top = (linhas ?? []).slice(0, 10);
  const maior = Math.max(...top.map((linha) => Number(linha[campoValor] ?? 0)), 1);

  const colunasOrdenacao = useMemo(() => {
    const mapa: ColunasOrdenacao<Linha> = {};
    for (const coluna of colunas) {
      mapa[coluna.key] = { tipo: tipoOrdenacaoColuna(coluna.tipo) };
    }
    return mapa;
  }, [colunas]);

  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(
    linhas,
    colunasOrdenacao,
  );
  const paginacao = usePaginacao(
    ordenadas,
    `${queryKey}:${busca}:${anos.join(",")}:${meses.join(",")}:${chaveReset}`,
  );

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
          <FiltroPeriodo
            anos={anos}
            meses={meses}
            onAnosChange={setAnos}
            onMesesChange={setMeses}
            anosOpcoes={anosOpcoes}
            className="max-w-xl"
          />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder={buscaPlaceholder}
            className="max-w-xl"
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
            <>
              <BotaoExportarTabela
                nomeArquivo={tableTitle}
                colunas={colunas.map((coluna) => ({
                  rotulo: coluna.label,
                  valor: (linha: Linha) => {
                    const bruto = linha[coluna.key];
                    if (
                      coluna.tipo === "pct" ||
                      coluna.tipo === "numero" ||
                      coluna.tipo === "decimal"
                    ) {
                      return bruto == null || bruto === "" ? null : Number(bruto);
                    }
                    return bruto == null ? null : String(bruto);
                  },
                }))}
                linhas={ordenadas}
              />
              <PaginatedContent
                pageKey={paginacao.pageKey}
                direction={paginacao.transicao}
                className="overflow-x-auto"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      {colunas.map((coluna) => (
                        <CabecalhoOrdenavel
                          key={coluna.key}
                          label={coluna.label}
                          coluna={coluna.key}
                          ordenacao={ordenacao}
                          onOrdenar={alternar}
                          align={coluna.tipo && coluna.tipo !== "texto" ? "right" : "left"}
                        />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginacao.visiveis.map((linha, index) => (
                      <TableRow
                        key={`${String(linha[campoRotulo])}-${paginacao.inicio + index}`}
                      >
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
                    {paginacao.total === 0 ? (
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
              </PaginatedContent>
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
        </div>
      </PanelBlock>
    </div>
  );
}
