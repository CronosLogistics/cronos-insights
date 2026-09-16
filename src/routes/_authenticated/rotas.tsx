import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  ListChecks,
  Network,
  Search,
  Target,
  TrendingDown,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FILTRO_TODOS,
  formatarDiferenca,
  formatarPct,
  type AnaliseRotas,
  type FiltrosRotas,
  type LinhaClienteColoader,
  type LinhaMotivo,
  type LinhaRanking,
} from "@/lib/route-analysis";
import { getAnaliseRotas, getRotasOpcoesFiltro } from "@/lib/route-analysis-fn";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rotas")({
  head: () => ({
    meta: [
      { title: "Rotas — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha de inteligência da rota: indicadores, perfil do recorte, insights de pricing, coloaders, clientes, agentes e motivos de reprovação.",
      },
      { property: "og:title", content: "Rotas — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Inteligência de rotas por origem, destino e desempenho comercial.",
      },
    ],
  }),
  component: RotasPage,
});

const inteiro = (valor: number) => valor.toLocaleString("pt-BR");

const FILTROS_INICIAIS: FiltrosRotas = {
  paisOrigem: FILTRO_TODOS,
  portoOrigem: FILTRO_TODOS,
  paisDestino: FILTRO_TODOS,
  portoDestino: FILTRO_TODOS,
  rota: FILTRO_TODOS,
};

function chaveFiltros(f: FiltrosRotas): string {
  return [
    f.paisOrigem,
    f.portoOrigem,
    f.paisDestino,
    f.portoDestino,
    f.rota,
  ].join("|");
}

function RotasPage() {
  const [filtros, setFiltros] = useState<FiltrosRotas>(FILTROS_INICIAIS);

  const opcoes = useQuery({
    queryKey: ["rotas-opcoes-filtro"],
    queryFn: () => getRotasOpcoesFiltro(),
    staleTime: 5 * 60 * 1000,
  });

  const analise = useQuery({
    queryKey: ["analise-rotas", filtros],
    queryFn: () => getAnaliseRotas({ data: filtros }),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  function atualizar<K extends keyof FiltrosRotas>(campo: K, valor: string) {
    setFiltros((atual) => ({ ...atual, [campo]: valor || FILTRO_TODOS }));
  }

  const resetKey = chaveFiltros(filtros);

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Inteligência"
        title="Rotas"
        description="Ficha de inteligência da rota"
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pesquisa
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <GrupoFiltros titulo="Filtros de origem">
              <FiltroSelect
                label="País de origem"
                value={filtros.paisOrigem}
                onChange={(v) => atualizar("paisOrigem", v)}
                opcoes={opcoes.data?.paisesOrigem ?? []}
                carregando={opcoes.isPending}
              />
              <FiltroSelect
                label="Porto de origem"
                value={filtros.portoOrigem}
                onChange={(v) => atualizar("portoOrigem", v)}
                opcoes={opcoes.data?.portosOrigem ?? []}
                carregando={opcoes.isPending}
              />
            </GrupoFiltros>

            <GrupoFiltros titulo="Filtros de destino">
              <FiltroSelect
                label="País de destino"
                value={filtros.paisDestino}
                onChange={(v) => atualizar("paisDestino", v)}
                opcoes={opcoes.data?.paisesDestino ?? []}
                carregando={opcoes.isPending}
              />
              <FiltroSelect
                label="Porto de destino"
                value={filtros.portoDestino}
                onChange={(v) => atualizar("portoDestino", v)}
                opcoes={opcoes.data?.portosDestino ?? []}
                carregando={opcoes.isPending}
              />
            </GrupoFiltros>

            <GrupoFiltros titulo="Filtro de rota">
              <FiltroSelect
                label="Rota"
                value={filtros.rota}
                onChange={(v) => atualizar("rota", v)}
                opcoes={opcoes.data?.rotas ?? []}
                carregando={opcoes.isPending}
              />
            </GrupoFiltros>
          </div>

          {opcoes.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar as opções de filtro.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {analise.isPending && !analise.data ? (
        <FichaSkeleton />
      ) : analise.isError && !analise.data ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Info className="size-4" />
          Não foi possível calcular a análise deste recorte.
        </p>
      ) : analise.data ? (
        <div className={cn(analise.isFetching && "opacity-70 transition-opacity")}>
          <Ficha analise={analise.data} resetKey={resetKey} />
        </div>
      ) : null}
    </div>
  );
}

function GrupoFiltros({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  opcoes,
  carregando,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: string[];
  carregando: boolean;
}) {
  const itens = useMemo(() => {
    const base = opcoes.filter((o) => o !== FILTRO_TODOS);
    return [FILTRO_TODOS, ...base];
  }, [opcoes]);

  if (carregando) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={FILTRO_TODOS} />
        </SelectTrigger>
        <SelectContent>
          {itens.map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {opcao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FichaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className={cn(i === 2 && "md:col-span-2 xl:col-span-1")}>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-4 w-28" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-7 w-14" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-4 w-48" />
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Ficha({ analise, resetKey }: { analise: AnaliseRotas; resetKey: string }) {
  const { indicadores: ind, perfil } = analise;
  const semDados = ind.rotas === 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PanelBlock
        title="Indicadores do recorte"
        description="Volume, resultado e performance do recorte filtrado."
        action={
          <Badge className="border-transparent bg-accent text-accent-foreground hover:bg-accent">
            Dados reais
          </Badge>
        }
      >
        <div className="grid w-full min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <GrupoIndicadores
            titulo="Volume"
            tom="volume"
            itens={[
              { titulo: "Rotas", valor: inteiro(ind.rotas), icone: BookOpen },
              { titulo: "Ofertas", valor: inteiro(ind.ofertas), icone: FileText },
              { titulo: "Clientes", valor: inteiro(ind.clientes), icone: Building2 },
              { titulo: "Rotas distintas", valor: inteiro(ind.rotasDistintas), icone: Network },
              { titulo: "Coloaders", valor: inteiro(ind.coloaders), icone: Users },
            ]}
          />
          <GrupoIndicadores
            titulo="Resultado"
            tom="resultado"
            itens={[
              {
                titulo: "Aprovadas",
                valor: inteiro(ind.aprovadas),
                icone: CheckCircle2,
                tomIcone: "positivo",
              },
              {
                titulo: "Reprovadas",
                valor: inteiro(ind.reprovadas),
                icone: XCircle,
                tomIcone: "negativo",
              },
              {
                titulo: "Em análise",
                valor: inteiro(ind.emAnalise),
                icone: Clock,
                tomIcone: "positivo",
              },
              {
                titulo: "Decisões",
                valor: inteiro(ind.decisoes),
                icone: ListChecks,
              },
            ]}
          />
          <GrupoIndicadores
            titulo="Performance"
            tom="performance"
            className="md:col-span-2 xl:col-span-1"
            itens={[
              {
                titulo: "Taxa de aprovação",
                valor: formatarPct(ind.taxaAprovacao),
                icone: CheckCircle2,
                tomIcone: "positivo",
              },
              {
                titulo: "Taxa de reprovação",
                valor: formatarPct(ind.taxaReprovacao),
                icone: TrendingDown,
              },
              {
                titulo: "Conversão recorte",
                valor: formatarPct(ind.conversaoRecorte),
                icone: BarChart3,
              },
              {
                titulo: "Média geral",
                valor: formatarPct(ind.mediaGeral),
                icone: Target,
              },
              {
                titulo: "Diferença",
                valor: formatarDiferenca(ind.diferenca),
                icone: ArrowLeftRight,
                tomIcone: ind.diferenca > 0 ? "positivo" : ind.diferenca < 0 ? "negativo" : "padrao",
              },
            ]}
          />
        </div>
      </PanelBlock>

      {semDados ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Network className="size-6 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">Nenhum registro no recorte selecionado.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Ajuste os filtros de origem, destino ou rota para ampliar o conjunto analisado.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <PanelBlock
        title="Perfil do recorte"
        description="Coloaders e motivo mais relevantes do recorte."
      >
        <ul className="divide-y divide-border/60">
          {[
            { titulo: "Mais recorrente", valor: perfil.maisRecorrente },
            { titulo: "Mais aprovações", valor: perfil.maisAprovacoes },
            { titulo: "Mais reprovações", valor: perfil.maisReprovacoes },
            { titulo: "Melhor conversão", valor: perfil.melhorConversao },
            { titulo: "Pior conversão", valor: perfil.piorConversao },
            { titulo: "Principal motivo", valor: perfil.principalMotivo },
          ].map((item) => (
            <li
              key={item.titulo}
              className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {item.titulo}
              </span>
              <span className="text-sm font-medium leading-snug">{item.valor}</span>
            </li>
          ))}
        </ul>
      </PanelBlock>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock title="Insights de Pricing" description="Leitura automática dos indicadores.">
          <ListaInsights itens={analise.insightsPricing} />
        </PanelBlock>
        <PanelBlock title="Onde atuar" description="Prioridades sugeridas para o recorte.">
          <ListaInsights itens={analise.ondeAtuar} />
        </PanelBlock>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TabelaRanking
          titulo="Coloaders da rota"
          descricao="Volume e conversão por coloader/armador."
          rotuloItem="Item"
          linhas={analise.coloaders}
          resetKey={`${resetKey}-coloaders`}
        />
        <TabelaRanking
          titulo="Clientes da rota"
          descricao="Volume e conversão por cliente."
          rotuloItem="Item"
          linhas={analise.clientes}
          resetKey={`${resetKey}-clientes`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TabelaRanking
          titulo="Agentes da rota"
          descricao="Desempenho por agente no exterior."
          rotuloItem="Item"
          linhas={analise.agentes}
          resetKey={`${resetKey}-agentes`}
        />
        <TabelaMotivos linhas={analise.motivos} resetKey={`${resetKey}-motivos`} />
      </div>

      <TabelaClienteColoader
        linhas={analise.clienteColoader}
        resetKey={`${resetKey}-cliente-coloader`}
      />
    </div>
  );
}

type TomGrupo = "volume" | "resultado" | "performance";
type TomIcone = "padrao" | "positivo" | "negativo";

const tons: Record<TomGrupo, { cabecalho: string; icone: string }> = {
  volume: {
    cabecalho: "bg-[#fce4ec] text-[#AC145A]",
    icone: "text-[#AC145A]/80",
  },
  resultado: {
    cabecalho: "bg-emerald-50 text-emerald-700",
    icone: "text-emerald-600",
  },
  performance: {
    cabecalho: "bg-sky-50 text-sky-700",
    icone: "text-sky-600",
  },
};

function GrupoIndicadores({
  titulo,
  tom,
  itens,
  className,
}: {
  titulo: string;
  tom: TomGrupo;
  className?: string;
  itens: {
    titulo: string;
    valor: string;
    icone: LucideIcon;
    tomIcone?: TomIcone;
  }[];
}) {
  const estilo = tons[tom];
  const cincoItens = itens.length >= 5;
  const total = itens.length;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "px-3 py-2 text-sm font-bold leading-none sm:px-4 sm:py-2.5",
          estilo.cabecalho,
        )}
      >
        + {titulo}
      </div>
      <ul
        className={cn(
          "grid w-full flex-1 gap-2 p-2 sm:gap-3 sm:p-3",
          cincoItens ? "grid-cols-6" : "grid-cols-2",
        )}
      >
        {itens.map((item, index) => {
          const Icone = item.icone;
          const corIcone =
            item.tomIcone === "positivo"
              ? "text-emerald-600"
              : item.tomIcone === "negativo"
                ? "text-red-500"
                : estilo.icone;
          const ultimo = index === total - 1;

          return (
            <li
              key={item.titulo}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1.5 px-1 py-2 text-center sm:gap-2 sm:py-2.5",
                cincoItens &&
                  (index < 3
                    ? "col-span-3 sm:col-span-2"
                    : ultimo
                      ? "col-span-6 sm:col-span-3"
                      : "col-span-3"),
                !cincoItens && total % 2 === 1 && ultimo && "col-span-2",
              )}
            >
              <Icone
                className={cn("size-3.5 shrink-0 sm:size-4", corIcone)}
                strokeWidth={1.75}
              />
              <span className="min-w-0">
                <span className="block break-words font-heading text-base font-bold leading-tight tracking-tight sm:text-lg xl:text-xl">
                  {item.valor}
                </span>
                <span className="mt-0.5 block break-words text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                  {item.titulo}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ListaInsights({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-3">
      {itens.map((texto, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
          <span>{texto}</span>
        </li>
      ))}
    </ul>
  );
}

function VazioTabela({ colunas }: { colunas: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colunas} className="text-center text-muted-foreground">
        Sem dados para este recorte.
      </TableCell>
    </TableRow>
  );
}

function TabelaRanking({
  titulo,
  descricao,
  rotuloItem,
  linhas,
  resetKey,
}: {
  titulo: string;
  descricao: string;
  rotuloItem: string;
  linhas: LinhaRanking[];
  resetKey: string;
}) {
  const paginacao = usePaginacao(linhas, resetKey);
  return (
    <PanelBlock className="h-full" title={titulo} description={descricao}>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <PaginatedContent
          pageKey={paginacao.pageKey}
          direction={paginacao.transicao}
          className="overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{rotuloItem}</TableHead>
                <TableHead className="text-right">Rotas</TableHead>
                <TableHead className="text-right">Aprovadas</TableHead>
                <TableHead className="text-right">Reprovadas</TableHead>
                <TableHead className="text-right">Em análise</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginacao.visiveis.map((linha, i) => (
                <TableRow key={`${linha.item}-${paginacao.inicio + i}`}>
                  <TableCell className="max-w-[280px] truncate">{linha.item}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.rotas)}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.aprovadas)}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.reprovadas)}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.emAnalise)}</TableCell>
                  <TableCell className="text-right">{formatarPct(linha.conversao)}</TableCell>
                </TableRow>
              ))}
              {linhas.length === 0 ? <VazioTabela colunas={6} /> : null}
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
      </div>
    </PanelBlock>
  );
}

function TabelaMotivos({
  linhas,
  resetKey,
}: {
  linhas: LinhaMotivo[];
  resetKey: string;
}) {
  const paginacao = usePaginacao(linhas, resetKey);
  return (
    <PanelBlock
      className="h-full"
      title="Motivos de reprovação"
      description="Distribuição das reprovações do recorte por motivo."
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <PaginatedContent
          pageKey={paginacao.pageKey}
          direction={paginacao.transicao}
          className="overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Reprovadas</TableHead>
                <TableHead className="text-right">% das reprovações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginacao.visiveis.map((linha, i) => (
                <TableRow key={`${linha.motivo}-${paginacao.inicio + i}`}>
                  <TableCell className="max-w-[420px] truncate">{linha.motivo}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.reprovadas)}</TableCell>
                  <TableCell className="text-right">{formatarPct(linha.participacao)}</TableCell>
                </TableRow>
              ))}
              {linhas.length === 0 ? <VazioTabela colunas={3} /> : null}
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
      </div>
    </PanelBlock>
  );
}

function TabelaClienteColoader({
  linhas,
  resetKey,
}: {
  linhas: LinhaClienteColoader[];
  resetKey: string;
}) {
  const paginacao = usePaginacao(linhas, resetKey);
  return (
    <PanelBlock
      title="Combinações importantes — Cliente × Coloader"
      description="Combinações com mais reprovações (desempate por volume)."
      action={<Search className="size-4 text-muted-foreground" />}
    >
      <PaginatedContent
        pageKey={paginacao.pageKey}
        direction={paginacao.transicao}
        className="overflow-x-auto"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dimensão 1</TableHead>
              <TableHead>Dimensão 2</TableHead>
              <TableHead className="text-right">Rotas</TableHead>
              <TableHead className="text-right">Aprovadas</TableHead>
              <TableHead className="text-right">Reprovadas</TableHead>
              <TableHead className="text-right">Em análise</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginacao.visiveis.map((linha, i) => (
              <TableRow key={`${linha.cliente}-${linha.coloader}-${paginacao.inicio + i}`}>
                <TableCell className="max-w-[220px] truncate">{linha.cliente}</TableCell>
                <TableCell className="max-w-[220px] truncate">{linha.coloader}</TableCell>
                <TableCell className="text-right">{inteiro(linha.rotas)}</TableCell>
                <TableCell className="text-right">{inteiro(linha.aprovadas)}</TableCell>
                <TableCell className="text-right">{inteiro(linha.reprovadas)}</TableCell>
                <TableCell className="text-right">{inteiro(linha.emAnalise)}</TableCell>
                <TableCell className="text-right">{formatarPct(linha.conversao)}</TableCell>
              </TableRow>
            ))}
            {linhas.length === 0 ? <VazioTabela colunas={7} /> : null}
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
    </PanelBlock>
  );
}
