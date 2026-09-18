import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  FileText,
  Info,
  Lightbulb,
  Network,
  Search,
  Ship,
  TrendingDown,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
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
  formatarMesCurto,
  formatarMesTabela,
  formatarPct,
  type AnaliseDashboard,
  type FiltrosDashboard,
  type LinhaEvolucaoMensal,
} from "@/lib/dashboard-analysis";
import {
  getAnaliseDashboard,
  getDashboardOpcoesFiltro,
} from "@/lib/dashboard-analysis-fn";
import { cn } from "@/lib/utils";

/** Escala de cores da planilha (E30:E41): vermelho → amarelo → verde. */
const ESCALA_CONVERSAO = {
  baixo: [248, 105, 107] as const,
  medio: [255, 235, 132] as const,
  alto: [99, 190, 123] as const,
  texto: "#263238",
};

function misturarRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): string {
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Color scale Excel: min / percentil 50 / max. */
function corFundoConversao(
  valor: number,
  min: number,
  mediana: number,
  max: number,
): string {
  if (!Number.isFinite(valor)) return misturarRgb(ESCALA_CONVERSAO.medio, ESCALA_CONVERSAO.medio, 0);
  if (max <= min) return misturarRgb(ESCALA_CONVERSAO.medio, ESCALA_CONVERSAO.medio, 0);
  if (valor <= mediana) {
    const t = mediana === min ? 0 : (valor - min) / (mediana - min);
    return misturarRgb(ESCALA_CONVERSAO.baixo, ESCALA_CONVERSAO.medio, t);
  }
  const t = max === mediana ? 1 : (valor - mediana) / (max - mediana);
  return misturarRgb(ESCALA_CONVERSAO.medio, ESCALA_CONVERSAO.alto, t);
}

function medianaNumeros(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  if (ord.length % 2 === 1) return ord[meio]!;
  return (ord[meio - 1]! + ord[meio]!) / 2;
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Dashboard analítico de Pricing: indicadores, oportunidades, evolução mensal e conversão.",
      },
      { property: "og:title", content: "Dashboard — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Visão executiva da análise de cotações de Pricing.",
      },
    ],
  }),
  component: DashboardPage,
});

const inteiro = (valor: number) => valor.toLocaleString("pt-BR");

const chartConfig = {
  conversao: {
    label: "Conversão",
    color: "var(--accent)",
  },
} satisfies ChartConfig;

type FiltrosUi = {
  dataInicial: string | null;
  dataFinal: string | null;
  analista: string;
  vendedor: string;
  cliente: string;
  origem: string;
  destino: string;
  rota: string;
  coloader: string;
  resultado: string;
  motivo: string;
  datasProntas: boolean;
};

const FILTROS_INICIAIS: FiltrosUi = {
  dataInicial: null,
  dataFinal: null,
  analista: FILTRO_TODOS,
  vendedor: FILTRO_TODOS,
  cliente: FILTRO_TODOS,
  origem: FILTRO_TODOS,
  destino: FILTRO_TODOS,
  rota: FILTRO_TODOS,
  coloader: FILTRO_TODOS,
  resultado: FILTRO_TODOS,
  motivo: FILTRO_TODOS,
  datasProntas: false,
};

const DASHBOARD_STORAGE_KEY = "cronos-insights:dashboard:selecao";

type DashboardPersistido = {
  filtros: Omit<FiltrosUi, "datasProntas">;
  consulta: FiltrosDashboard | null;
};

function textoOuTodos(valor: unknown): string {
  if (typeof valor !== "string") return FILTRO_TODOS;
  const t = valor.trim();
  return t === "" ? FILTRO_TODOS : t;
}

function dataOuNull(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function readSavedDashboard(): { filtros: FiltrosUi; consulta: FiltrosDashboard | null } {
  if (typeof window === "undefined") {
    return { filtros: FILTROS_INICIAIS, consulta: null };
  }
  try {
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return { filtros: FILTROS_INICIAIS, consulta: null };
    const parsed = JSON.parse(raw) as Partial<DashboardPersistido>;
    const f = (parsed.filtros ?? {}) as Record<string, unknown>;
    const filtros: FiltrosUi = {
      dataInicial: dataOuNull(f["dataInicial"]),
      dataFinal: dataOuNull(f["dataFinal"]),
      analista: textoOuTodos(f["analista"]),
      vendedor: textoOuTodos(f["vendedor"]),
      cliente: textoOuTodos(f["cliente"]),
      origem: textoOuTodos(f["origem"]),
      destino: textoOuTodos(f["destino"]),
      rota: textoOuTodos(f["rota"]),
      coloader: textoOuTodos(f["coloader"]),
      resultado: textoOuTodos(f["resultado"]),
      motivo: textoOuTodos(f["motivo"]),
      datasProntas: Boolean(dataOuNull(f["dataInicial"]) || dataOuNull(f["dataFinal"])),
    };
    const c = parsed.consulta;
    const consulta: FiltrosDashboard | null =
      c && typeof c === "object"
        ? {
            dataInicial: dataOuNull(c.dataInicial),
            dataFinal: dataOuNull(c.dataFinal),
            analista: textoOuTodos(c.analista),
            vendedor: textoOuTodos(c.vendedor),
            cliente: textoOuTodos(c.cliente),
            origem: textoOuTodos(c.origem),
            destino: textoOuTodos(c.destino),
            rota: textoOuTodos(c.rota),
            coloader: textoOuTodos(c.coloader),
            resultado: textoOuTodos(c.resultado),
            motivo: textoOuTodos(c.motivo),
          }
        : null;
    return { filtros, consulta };
  } catch {
    return { filtros: FILTROS_INICIAIS, consulta: null };
  }
}

function saveDashboard(filtros: FiltrosUi, consulta: FiltrosDashboard | null) {
  if (typeof window === "undefined") return;
  try {
    const payload: DashboardPersistido = {
      filtros: {
        dataInicial: filtros.dataInicial,
        dataFinal: filtros.dataFinal,
        analista: filtros.analista,
        vendedor: filtros.vendedor,
        cliente: filtros.cliente,
        origem: filtros.origem,
        destino: filtros.destino,
        rota: filtros.rota,
        coloader: filtros.coloader,
        resultado: filtros.resultado,
        motivo: filtros.motivo,
      },
      consulta,
    };
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // storage indisponível
  }
}

function normalizarOpcao(valor: string, opcoes: string[]): string {
  if (valor === FILTRO_TODOS) return FILTRO_TODOS;
  return opcoes.includes(valor) ? valor : FILTRO_TODOS;
}

function paraConsulta(f: FiltrosUi): FiltrosDashboard {
  return {
    dataInicial: f.dataInicial,
    dataFinal: f.dataFinal,
    analista: f.analista || FILTRO_TODOS,
    vendedor: f.vendedor || FILTRO_TODOS,
    cliente: f.cliente || FILTRO_TODOS,
    origem: f.origem || FILTRO_TODOS,
    destino: f.destino || FILTRO_TODOS,
    rota: f.rota || FILTRO_TODOS,
    coloader: f.coloader || FILTRO_TODOS,
    resultado: f.resultado || FILTRO_TODOS,
    motivo: f.motivo || FILTRO_TODOS,
  };
}

function chaveFiltros(f: FiltrosDashboard): string {
  return [
    f.dataInicial,
    f.dataFinal,
    f.analista,
    f.vendedor,
    f.cliente,
    f.origem,
    f.destino,
    f.rota,
    f.coloader,
    f.resultado,
    f.motivo,
  ].join("|");
}

function DashboardPage() {
  const [salvo] = useState(() => readSavedDashboard());
  const [filtros, setFiltros] = useState<FiltrosUi>(salvo.filtros);
  const [consulta, setConsulta] = useState<FiltrosDashboard | null>(salvo.consulta);

  const opcoes = useQuery({
    queryKey: ["dashboard-opcoes-filtro"],
    queryFn: () => getDashboardOpcoesFiltro(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!opcoes.data) return;
    setFiltros((atual) => {
      const dataInicial = atual.dataInicial ?? opcoes.data.dataInicial;
      const dataFinal = atual.dataFinal ?? opcoes.data.dataFinal;
      const proximo: FiltrosUi = {
        ...atual,
        dataInicial,
        dataFinal,
        analista: normalizarOpcao(atual.analista, opcoes.data.analistas),
        vendedor: normalizarOpcao(atual.vendedor, opcoes.data.vendedores),
        cliente: normalizarOpcao(atual.cliente, opcoes.data.clientes),
        origem: normalizarOpcao(atual.origem, opcoes.data.origens),
        destino: normalizarOpcao(atual.destino, opcoes.data.destinos),
        rota: normalizarOpcao(atual.rota, opcoes.data.rotas),
        coloader: normalizarOpcao(atual.coloader, opcoes.data.coloaders),
        resultado: normalizarOpcao(atual.resultado, opcoes.data.resultados),
        motivo: normalizarOpcao(atual.motivo, opcoes.data.motivos),
        datasProntas: true,
      };
      const igual =
        proximo.dataInicial === atual.dataInicial &&
        proximo.dataFinal === atual.dataFinal &&
        proximo.analista === atual.analista &&
        proximo.vendedor === atual.vendedor &&
        proximo.cliente === atual.cliente &&
        proximo.origem === atual.origem &&
        proximo.destino === atual.destino &&
        proximo.rota === atual.rota &&
        proximo.coloader === atual.coloader &&
        proximo.resultado === atual.resultado &&
        proximo.motivo === atual.motivo &&
        proximo.datasProntas === atual.datasProntas;
      return igual ? atual : proximo;
    });
  }, [opcoes.data]);

  useEffect(() => {
    saveDashboard(filtros, consulta);
  }, [filtros, consulta]);

  const podePesquisar = filtros.datasProntas;

  const analise = useQuery({
    queryKey: ["analise-dashboard", consulta],
    queryFn: () => getAnaliseDashboard({ data: consulta as FiltrosDashboard }),
    enabled: Boolean(consulta),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  function atualizar<K extends keyof FiltrosUi>(campo: K, valor: FiltrosUi[K]) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }

  function pesquisar() {
    if (!podePesquisar) return;
    setConsulta(paraConsulta(filtros));
  }

  const resetKey = consulta ? chaveFiltros(consulta) : "vazio";

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Visão geral"
        title="Dashboard"
        description="Use Pesquisar para aplicar os filtros a todas as análises. Conversão = aprovadas ÷ (aprovadas + reprovadas)."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Filtros
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <CampoData
              label="Data inicial"
              value={filtros.dataInicial}
              onValueChange={(v) => atualizar("dataInicial", v)}
              carregando={opcoes.isPending}
            />
            <CampoData
              label="Data final"
              value={filtros.dataFinal}
              onValueChange={(v) => atualizar("dataFinal", v)}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Analista Pricing"
              placeholder="Todos"
              value={filtros.analista}
              onValueChange={(v) => atualizar("analista", v ?? "")}
              opcoes={opcoes.data?.analistas ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Vendedor"
              placeholder="Todos"
              value={filtros.vendedor}
              onValueChange={(v) => atualizar("vendedor", v ?? "")}
              opcoes={opcoes.data?.vendedores ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Cliente"
              placeholder="Todos"
              value={filtros.cliente}
              onValueChange={(v) => atualizar("cliente", v ?? "")}
              opcoes={opcoes.data?.clientes ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Origem"
              placeholder="Todos"
              value={filtros.origem}
              onValueChange={(v) => atualizar("origem", v ?? "")}
              opcoes={opcoes.data?.origens ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Destino"
              placeholder="Todos"
              value={filtros.destino}
              onValueChange={(v) => atualizar("destino", v ?? "")}
              opcoes={opcoes.data?.destinos ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Rota analítica"
              placeholder="Todos"
              value={filtros.rota}
              onValueChange={(v) => atualizar("rota", v ?? "")}
              opcoes={opcoes.data?.rotas ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Coloader / Armador"
              placeholder="Todos"
              value={filtros.coloader}
              onValueChange={(v) => atualizar("coloader", v ?? "")}
              opcoes={opcoes.data?.coloaders ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Resultado"
              placeholder="Todos"
              value={filtros.resultado}
              onValueChange={(v) => atualizar("resultado", v ?? "")}
              opcoes={opcoes.data?.resultados ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Motivo de reprovação"
              placeholder="Todos"
              value={filtros.motivo}
              onValueChange={(v) => atualizar("motivo", v ?? "")}
              opcoes={opcoes.data?.motivos ?? []}
              carregando={opcoes.isPending}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={pesquisar}
              disabled={!podePesquisar || analise.isFetching}
              className="gap-2"
            >
              <Search className="size-4" />
              Pesquisar
            </Button>
            {!podePesquisar ? (
              <p className="text-xs text-muted-foreground">
                Aguarde o carregamento das datas para pesquisar.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Os filtros só são aplicados ao clicar em Pesquisar.
              </p>
            )}
          </div>

          {opcoes.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar as opções de filtro.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!consulta ? (
        <EstadoVazio />
      ) : analise.isPending && !analise.data ? (
        <DashboardSkeleton />
      ) : analise.isError && !analise.data ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Info className="size-4" />
          Não foi possível calcular o Dashboard neste recorte.
        </p>
      ) : analise.data ? (
        <div className={cn(analise.isFetching && "opacity-70 transition-opacity")}>
          <ConteudoDashboard analise={analise.data} resetKey={resetKey} />
        </div>
      ) : null}
    </div>
  );
}

function ConteudoDashboard({
  analise,
  resetKey,
}: {
  analise: AnaliseDashboard;
  resetKey: string;
}) {
  const alt = analise.alternativas;
  const ofe = analise.ofertasUnicas;
  const chartData = analise.evolucaoMensal.map((l) => ({
    mes: formatarMesTabela(l.mes),
    mesCurto: formatarMesCurto(l.mes),
    conversao: Number((l.conversao * 100).toFixed(2)),
    conversaoFracao: l.conversao,
  }));

  return (
    <div className="w-full min-w-0 space-y-6">
      <PanelBlock
        title="Alternativas de rota"
        description="Indicadores sobre registros filtrados (Inclui_Filtro = 1)."
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
              { titulo: "Total", valor: inteiro(alt.total), icone: FileText },
              { titulo: "Clientes", valor: inteiro(alt.clientes), icone: Building2 },
              { titulo: "Rotas", valor: inteiro(alt.rotas), icone: Network },
              { titulo: "Coloaders", valor: inteiro(alt.coloaders), icone: Ship },
            ]}
          />
          <GrupoIndicadores
            titulo="Resultado"
            tom="resultado"
            itens={[
              {
                titulo: "Aprovadas",
                valor: inteiro(alt.aprovadas),
                icone: CheckCircle2,
                tomIcone: "positivo",
              },
              {
                titulo: "Reprovadas",
                valor: inteiro(alt.reprovadas),
                icone: XCircle,
                tomIcone: "negativo",
              },
              {
                titulo: "Em análise",
                valor: inteiro(alt.emAnalise),
                icone: Clock,
                tomIcone: "positivo",
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
                valor: formatarPct(alt.taxaAprovacao),
                icone: CheckCircle2,
                tomIcone: "positivo",
              },
              {
                titulo: "Taxa de reprovação",
                valor: formatarPct(alt.taxaReprovacao),
                icone: TrendingDown,
              },
            ]}
          />
        </div>
      </PanelBlock>

      <PanelBlock
        title="Ofertas únicas"
        description="Contagens distintas de Oferta dentro do mesmo recorte."
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
            itens={[{ titulo: "Total", valor: inteiro(ofe.total), icone: FileText }]}
          />
          <GrupoIndicadores
            titulo="Resultado"
            tom="resultado"
            itens={[
              {
                titulo: "Aprovadas",
                valor: inteiro(ofe.aprovadas),
                icone: CheckCircle2,
                tomIcone: "positivo",
              },
              {
                titulo: "Reprovadas",
                valor: inteiro(ofe.reprovadas),
                icone: XCircle,
                tomIcone: "negativo",
              },
              {
                titulo: "Em análise",
                valor: inteiro(ofe.emAnalise),
                icone: Clock,
                tomIcone: "positivo",
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
                valor: formatarPct(ofe.taxaAprovacao),
                icone: CheckCircle2,
                tomIcone: "positivo",
              },
              {
                titulo: "Taxa de reprovação",
                valor: formatarPct(ofe.taxaReprovacao),
                icone: TrendingDown,
              },
            ]}
          />
        </div>
      </PanelBlock>

      <PanelBlock
        title="Oportunidades de Pricing"
        description="Insights recalculados a cada alteração dos filtros globais."
      >
        <div className="flex flex-col gap-3">
          {[
            analise.oportunidades.slice(0, 3),
            analise.oportunidades.slice(3, 5),
            analise.oportunidades.slice(5, 7),
          ].map((linha, idx) => (
            <div
              key={idx}
              className={`grid gap-3 ${linha.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}
            >
              {linha.map((item) => (
                <div
                  key={item.titulo}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3 sm:p-4"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                      <Lightbulb className="size-3.5" />
                    </span>
                    <p className="text-xs font-semibold leading-snug">{item.titulo}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.texto}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PanelBlock>

      <PanelBlock
        title="Evolução mensal dos resultados"
        description="Mesma série utilizada no gráfico de conversão."
      >
        <TabelaEvolucaoMensal
          linhas={analise.evolucaoMensal}
          resetKey={`${resetKey}-evolucao`}
        />
      </PanelBlock>

      <PanelBlock
        title="Evolução mensal da conversão"
        description="Série única: Aprovadas ÷ (Aprovadas + Reprovadas) por mês."
      >
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados para o gráfico no recorte atual.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tickFormatter={(v) => `${v}%`}
                domain={[0, "auto"]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload as
                        | { mesCurto?: string; mes?: string }
                        | undefined;
                      return row?.mesCurto ?? row?.mes ?? "";
                    }}
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : Number(value);
                      return [
                        `${n.toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}%`,
                        "Conversão",
                      ];
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="conversao"
                stroke="var(--color-conversao)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </PanelBlock>
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

function TabelaEvolucaoMensal({
  linhas,
  resetKey,
}: {
  linhas: LinhaEvolucaoMensal[];
  resetKey: string;
}) {
  const paginacao = usePaginacao(linhas, resetKey);
  const conversoes = linhas.map((l) => l.conversao);
  const minCv = conversoes.length ? Math.min(...conversoes) : 0;
  const maxCv = conversoes.length ? Math.max(...conversoes) : 0;
  const medCv = medianaNumeros(conversoes);

  if (linhas.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem meses no recorte atual.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
      <PaginatedContent
        pageKey={paginacao.pageKey}
        direction={paginacao.transicao}
        className="overflow-x-auto"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Rotas</TableHead>
              <TableHead className="text-right">Aprovadas</TableHead>
              <TableHead className="text-right">Reprovadas</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginacao.visiveis.map((linha) => (
              <TableRow key={linha.mes}>
                <TableCell className="font-medium">
                  {formatarMesTabela(linha.mes)}
                </TableCell>
                <TableCell className="text-right">{inteiro(linha.rotas)}</TableCell>
                <TableCell className="text-right text-emerald-700">
                  {inteiro(linha.aprovadas)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {inteiro(linha.reprovadas)}
                </TableCell>
                <TableCell
                  className="text-right font-medium"
                  style={{
                    backgroundColor: corFundoConversao(linha.conversao, minCv, medCv, maxCv),
                    color: ESCALA_CONVERSAO.texto,
                  }}
                >
                  {formatarPct(linha.conversao)}
                </TableCell>
              </TableRow>
            ))}
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
  );
}

function EstadoVazio() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Search className="size-6 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium">Defina os filtros e clique em Pesquisar</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Os indicadores, oportunidades, evolução mensal e o gráfico são calculados
          apenas após a pesquisa.
        </p>
      </CardContent>
    </Card>
  );
}

function CampoData({
  label,
  value,
  onValueChange,
  carregando,
}: {
  label: string;
  value: string | null;
  onValueChange: (valor: string | null) => void;
  carregando: boolean;
}) {
  if (carregando) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  const temConteudo = Boolean(value);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative w-full">
        <Input
          type="date"
          value={value ?? ""}
          onChange={(event) => {
            const v = event.target.value;
            onValueChange(v || null);
          }}
          className={cn(temConteudo && "pr-9")}
        />
        {temConteudo ? (
          <button
            type="button"
            aria-label={`Limpar ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onValueChange(null)}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FiltroCombobox({
  label,
  placeholder,
  value,
  onValueChange,
  opcoes,
  carregando,
}: {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (valor: string | null) => void;
  opcoes: string[];
  carregando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(value);
  const [largura, setLargura] = useState<number>();
  const ancoraRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const valorExibido = aberto ? texto : value;
  const temConteudo = valorExibido.trim().length > 0;

  const itens = useMemo(() => {
    const vistos = new Set<string>([FILTRO_TODOS]);
    const lista = [FILTRO_TODOS];
    for (const opcao of opcoes) {
      if (!opcao || vistos.has(opcao)) continue;
      vistos.add(opcao);
      lista.push(opcao);
    }
    return lista;
  }, [opcoes]);

  useEffect(() => {
    setTexto(value);
  }, [value]);

  const filtrados = useMemo(() => {
    const termo = texto.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return itens;
    return itens.filter((nome) => nome.toLocaleLowerCase("pt-BR").includes(termo));
  }, [texto, itens]);

  function abrir() {
    setLargura(ancoraRef.current?.offsetWidth);
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    setTexto(value);
  }

  function selecionar(nome: string) {
    onValueChange(nome);
    setTexto(nome);
    setAberto(false);
  }

  function limpar(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onValueChange("");
    setTexto("");
    setAberto(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

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
      <Popover
        open={aberto}
        onOpenChange={(proximo) => {
          if (proximo) abrir();
          else fechar();
        }}
      >
        <PopoverAnchor asChild>
          <div ref={ancoraRef} className="relative w-full">
            <Input
              ref={inputRef}
              role="combobox"
              aria-expanded={aberto}
              autoComplete="off"
              placeholder={placeholder}
              value={valorExibido}
              onChange={(event) => {
                setTexto(event.target.value);
                abrir();
              }}
              onFocus={abrir}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  fechar();
                }
              }}
              className={cn("pr-9", temConteudo && "pr-16")}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {temConteudo ? (
                <button
                  type="button"
                  aria-label={`Limpar ${label}`}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={limpar}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
              <ChevronsUpDown className="pointer-events-none size-3.5 text-muted-foreground" />
            </div>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="p-0"
          style={{ width: largura }}
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
              <CommandGroup>
                {filtrados.map((nome) => (
                  <CommandItem
                    key={nome}
                    value={nome}
                    onSelect={() => selecionar(nome)}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        value === nome ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{nome}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-4 w-48" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
