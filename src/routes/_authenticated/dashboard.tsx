import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  FileText,
  Info,
  Lightbulb,
  Network,
  Ship,
  Target,
  TrendingDown,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/dashboard-analysis";
import {
  getAnaliseDashboard,
  getDashboardOpcoesFiltro,
} from "@/lib/dashboard-analysis-fn";
import { cn } from "@/lib/utils";

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
  const [filtros, setFiltros] = useState<FiltrosUi>(FILTROS_INICIAIS);

  const opcoes = useQuery({
    queryKey: ["dashboard-opcoes-filtro"],
    queryFn: () => getDashboardOpcoesFiltro(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!opcoes.data || filtros.datasProntas) return;
    setFiltros((atual) => ({
      ...atual,
      dataInicial: opcoes.data.dataInicial,
      dataFinal: opcoes.data.dataFinal,
      datasProntas: true,
    }));
  }, [opcoes.data, filtros.datasProntas]);

  const consulta = useMemo(
    () => (filtros.datasProntas ? paraConsulta(filtros) : null),
    [filtros],
  );

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

  const resetKey = consulta ? chaveFiltros(consulta) : "vazio";

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Visão geral"
        title="Dashboard"
        description="Filtros globais atualizam todas as análises. Conversão = aprovadas ÷ (aprovadas + reprovadas)."
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
              onValueChange={(v) => atualizar("analista", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.analistas ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Vendedor"
              placeholder="Todos"
              value={filtros.vendedor}
              onValueChange={(v) => atualizar("vendedor", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.vendedores ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Cliente"
              placeholder="Todos"
              value={filtros.cliente}
              onValueChange={(v) => atualizar("cliente", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.clientes ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Origem"
              placeholder="Todos"
              value={filtros.origem}
              onValueChange={(v) => atualizar("origem", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.origens ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Destino"
              placeholder="Todos"
              value={filtros.destino}
              onValueChange={(v) => atualizar("destino", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.destinos ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Rota analítica"
              placeholder="Todos"
              value={filtros.rota}
              onValueChange={(v) => atualizar("rota", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.rotas ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Coloader / Armador"
              placeholder="Todos"
              value={filtros.coloader}
              onValueChange={(v) => atualizar("coloader", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.coloaders ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Resultado"
              placeholder="Todos"
              value={filtros.resultado}
              onValueChange={(v) => atualizar("resultado", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.resultados ?? []}
              carregando={opcoes.isPending}
            />
            <FiltroCombobox
              label="Motivo de reprovação"
              placeholder="Todos"
              value={filtros.motivo}
              onValueChange={(v) => atualizar("motivo", v ?? FILTRO_TODOS)}
              opcoes={opcoes.data?.motivos ?? []}
              carregando={opcoes.isPending}
            />
          </div>

          {opcoes.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar as opções de filtro.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!consulta || (analise.isPending && !analise.data) ? (
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
      <div className="grid gap-4 xl:grid-cols-2">
        <PanelBlock
          title="Alternativas de rota"
          description="Indicadores sobre registros filtrados (Inclui_Filtro = 1)."
          action={
            <Badge className="border-transparent bg-accent text-accent-foreground hover:bg-accent">
              Dados reais
            </Badge>
          }
        >
          <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
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
                },
                {
                  titulo: "Taxa de aprovação",
                  valor: formatarPct(alt.taxaAprovacao),
                  icone: Target,
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
        >
          <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2">
            <GrupoIndicadores
              titulo="Volume"
              tom="volume"
              itens={[
                { titulo: "Total", valor: inteiro(ofe.total), icone: FileText },
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
                },
              ]}
            />
            <GrupoIndicadores
              titulo="Performance"
              tom="performance"
              itens={[
                {
                  titulo: "Taxa de aprovação",
                  valor: formatarPct(ofe.taxaAprovacao),
                  icone: Target,
                  tomIcone: "positivo",
                },
                {
                  titulo: "Taxa de reprovação",
                  valor: formatarPct(ofe.taxaReprovacao),
                  icone: TrendingDown,
                },
                {
                  titulo: "Conversão",
                  valor: formatarPct(ofe.taxaAprovacao),
                  icone: BarChart3,
                },
              ]}
            />
          </div>
        </PanelBlock>
      </div>

      <PanelBlock
        title="Oportunidades de Pricing"
        description="Insights recalculados a cada alteração dos filtros globais."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {analise.oportunidades.map((item) => (
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
      </PanelBlock>

      <PanelBlock
        title="Evolução mensal dos resultados"
        description="Mesma série utilizada no gráfico de conversão."
      >
        {analise.evolucaoMensal.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem meses no recorte atual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table key={resetKey}>
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
                {analise.evolucaoMensal.map((linha) => (
                  <TableRow key={linha.mes}>
                    <TableCell className="font-medium">
                      {formatarMesTabela(linha.mes)}
                    </TableCell>
                    <TableCell className="text-right">{inteiro(linha.rotas)}</TableCell>
                    <TableCell className="text-right">{inteiro(linha.aprovadas)}</TableCell>
                    <TableCell className="text-right">{inteiro(linha.reprovadas)}</TableCell>
                    <TableCell className="text-right">
                      {formatarPct(linha.conversao)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
}: {
  titulo: string;
  tom: TomGrupo;
  itens: {
    titulo: string;
    valor: string;
    icone: LucideIcon;
    tomIcone?: TomIcone;
  }[];
}) {
  const estilo = tons[tom];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-lg border border-border bg-card">
      <div
        className={cn(
          "px-3 py-2 text-sm font-bold leading-none sm:px-4 sm:py-2.5",
          estilo.cabecalho,
        )}
      >
        + {titulo}
      </div>
      <ul className="grid w-full flex-1 grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-3">
        {itens.map((item) => {
          const tomIcone = item.tomIcone ?? "padrao";
          return (
            <li
              key={item.titulo}
              className="flex min-w-0 flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] text-muted-foreground">{item.titulo}</p>
                <item.icone
                  className={cn(
                    "size-3.5 shrink-0",
                    tomIcone === "positivo" && "text-emerald-600",
                    tomIcone === "negativo" && "text-destructive",
                    tomIcone === "padrao" && estilo.icone,
                  )}
                />
              </div>
              <p className="font-heading text-lg font-semibold leading-none">{item.valor}</p>
            </li>
          );
        })}
      </ul>
    </div>
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

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Input
        type="date"
        value={value ?? ""}
        onChange={(event) => {
          const v = event.target.value;
          onValueChange(v || null);
        }}
      />
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
  const [texto, setTexto] = useState(value === FILTRO_TODOS ? "" : value);
  const [largura, setLargura] = useState<number>();
  const ancoraRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const temConteudo = Boolean(texto.trim() || (value && value !== FILTRO_TODOS));

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
    setTexto(value === FILTRO_TODOS ? "" : value);
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
    setTexto(value === FILTRO_TODOS ? "" : value);
  }

  function selecionar(nome: string) {
    onValueChange(nome);
    setTexto(nome === FILTRO_TODOS ? "" : nome);
    setAberto(false);
  }

  function limpar(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onValueChange(FILTRO_TODOS);
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
              value={aberto ? texto : value === FILTRO_TODOS ? FILTRO_TODOS : value}
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
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
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
