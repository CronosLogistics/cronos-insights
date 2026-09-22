import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  FileText,
  Info,
  ListChecks,
  Network,
  Search,
  Target,
  TrendingDown,
  Users,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { BotaoExportarTabela } from "@/components/data/table-export";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import {
  CabecalhoOrdenavel,
  COLUNAS_MOTIVOS,
  COLUNAS_RANKING,
  colunasCruzamento,
  useOrdenacaoTabela,
} from "@/components/data/table-sort";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FILTRO_TODOS,
  ROTA_INCOMPLETA,
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

/** Seleção da UI: null = ainda não escolhido (não dispara a análise). */
type FiltrosSelecao = {
  [K in keyof FiltrosRotas]: string | null;
};

const FILTROS_VAZIOS: FiltrosSelecao = {
  paisOrigem: null,
  portoOrigem: null,
  paisDestino: null,
  portoDestino: null,
  rota: null,
};

function temAlgumFiltro(f: FiltrosSelecao): boolean {
  return Object.values(f).some((v) => v !== null);
}

/** Campos vazios viram "Todos" (sem restrição), como na planilha. */
function paraConsulta(f: FiltrosSelecao): FiltrosRotas {
  return {
    paisOrigem: f.paisOrigem ?? FILTRO_TODOS,
    portoOrigem: f.portoOrigem ?? FILTRO_TODOS,
    paisDestino: f.paisDestino ?? FILTRO_TODOS,
    portoDestino: f.portoDestino ?? FILTRO_TODOS,
    rota: f.rota ?? FILTRO_TODOS,
  };
}

function chaveFiltros(f: FiltrosRotas): string {
  return [f.paisOrigem, f.portoOrigem, f.paisDestino, f.portoDestino, f.rota].join("|");
}

function RotasPage() {
  const termos = useTerminologia();
  const [filtros, setFiltros] = useState<FiltrosSelecao>(FILTROS_VAZIOS);
  const [consulta, setConsulta] = useState<FiltrosRotas | null>(null);
  const podePesquisar = temAlgumFiltro(filtros);

  const opcoes = useQuery({
    queryKey: ["rotas-opcoes-filtro"],
    queryFn: () => getRotasOpcoesFiltro(),
    staleTime: 5 * 60 * 1000,
  });

  const analise = useQuery({
    queryKey: ["analise-rotas", consulta],
    queryFn: () => getAnaliseRotas({ data: consulta as FiltrosRotas }),
    enabled: Boolean(consulta),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  function atualizar<K extends keyof FiltrosSelecao>(campo: K, valor: string | null) {
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
              <FiltroCombobox
                label="País de origem"
                placeholder="Digite ou selecione o país de origem"
                value={filtros.paisOrigem}
                onValueChange={(v) => atualizar("paisOrigem", v)}
                opcoes={opcoes.data?.paisesOrigem ?? []}
                carregando={opcoes.isPending}
              />
              <FiltroCombobox
                label={`${termos.terminal} de origem`}
                placeholder={`Digite ou selecione o ${termos.terminalMinusculo} de origem`}
                value={filtros.portoOrigem}
                onValueChange={(v) => atualizar("portoOrigem", v)}
                opcoes={opcoes.data?.portosOrigem ?? []}
                carregando={opcoes.isPending}
              />
            </GrupoFiltros>

            <GrupoFiltros titulo="Filtros de destino">
              <FiltroCombobox
                label="País de destino"
                placeholder="Digite ou selecione o país de destino"
                value={filtros.paisDestino}
                onValueChange={(v) => atualizar("paisDestino", v)}
                opcoes={opcoes.data?.paisesDestino ?? []}
                carregando={opcoes.isPending}
              />
              <FiltroCombobox
                label={`${termos.terminal} de destino`}
                placeholder={`Digite ou selecione o ${termos.terminalMinusculo} de destino`}
                value={filtros.portoDestino}
                onValueChange={(v) => atualizar("portoDestino", v)}
                opcoes={opcoes.data?.portosDestino ?? []}
                carregando={opcoes.isPending}
              />
            </GrupoFiltros>

            <GrupoFiltros titulo="Filtro de rota">
              <FiltroCombobox
                label="Rota"
                placeholder="Digite ou selecione a rota"
                value={filtros.rota}
                onValueChange={(v) => atualizar("rota", v)}
                opcoes={opcoes.data?.rotas ?? []}
                opcoesFixas={[ROTA_INCOMPLETA]}
                carregando={opcoes.isPending}
              />
            </GrupoFiltros>
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
                Preencha ao menos um filtro para pesquisar.
              </p>
            ) : null}
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

function FiltroCombobox({
  label,
  placeholder,
  value,
  onValueChange,
  opcoes,
  opcoesFixas = [],
  carregando,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  onValueChange: (valor: string | null) => void;
  opcoes: string[];
  /** Opções sempre presentes (ex.: "(Rota incompleta)"), além das vindas do servidor. */
  opcoesFixas?: string[];
  carregando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(value ?? "");
  const [largura, setLargura] = useState<number>();
  const ancoraRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const temConteudo = Boolean(texto.trim() || value);

  const itens = useMemo(() => {
    const vistos = new Set<string>([FILTRO_TODOS]);
    const lista = [FILTRO_TODOS];
    for (const opcao of [...opcoesFixas, ...opcoes]) {
      if (!opcao || vistos.has(opcao)) continue;
      vistos.add(opcao);
      lista.push(opcao);
    }
    return lista;
  }, [opcoes, opcoesFixas]);

  useEffect(() => {
    setTexto(value ?? "");
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
    setTexto(value ?? "");
  }

  function selecionar(nome: string) {
    onValueChange(nome);
    setTexto(nome);
    setAberto(false);
  }

  function limpar(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onValueChange(null);
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
              value={texto}
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
                  aria-label={`Limpar ${label.toLocaleLowerCase("pt-BR")}`}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={limpar}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
              <ChevronsUpDown className="pointer-events-none size-4 opacity-50" />
            </div>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="p-0"
          align="start"
          style={largura ? { width: largura } : undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            if (ancoraRef.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (ancoraRef.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
              <CommandGroup>
                {filtrados.map((nome) => (
                  <CommandItem key={nome} value={nome} onSelect={() => selecionar(nome)}>
                    <Check
                      className={cn(
                        "size-4 shrink-0",
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

function EstadoVazio() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Network className="size-6 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium">
          Defina os filtros e clique em Pesquisar para ver a análise.
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Basta preencher ao menos um campo. Os demais ficam sem restrição até você
          escolher um valor. A ficha só é calculada ao clicar na lupa.
        </p>
      </CardContent>
    </Card>
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
  const termos = useTerminologia();
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
          descricao={`Volume e conversão por ${termos.coloaderLabelMinusculo}.`}
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
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(linhas, COLUNAS_RANKING);
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock className="h-full" title={titulo} description={descricao}>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <BotaoExportarTabela
          nomeArquivo={`ranking-${rotuloItem.toLocaleLowerCase("pt-BR")}`}
          colunas={[
            { rotulo: rotuloItem, valor: (l) => l.item },
            { rotulo: "Rotas", valor: (l) => l.rotas },
            { rotulo: "Aprovadas", valor: (l) => l.aprovadas },
            { rotulo: "Reprovadas", valor: (l) => l.reprovadas },
            { rotulo: "Em análise", valor: (l) => l.emAnalise },
            { rotulo: "Conversão", valor: (l) => l.conversao },
          ]}
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
                <CabecalhoOrdenavel
                  label={rotuloItem}
                  coluna="item"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Rotas"
                  coluna="rotas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Aprovadas"
                  coluna="aprovadas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Reprovadas"
                  coluna="reprovadas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Em análise"
                  coluna="emAnalise"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Conversão"
                  coluna="conversao"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
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
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(linhas, COLUNAS_MOTIVOS);
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock
      className="h-full"
      title="Motivos de reprovação"
      description="Distribuição das reprovações do recorte por motivo."
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <BotaoExportarTabela
          nomeArquivo="motivos-reprovacao"
          colunas={[
            { rotulo: "Motivo", valor: (l) => l.motivo },
            { rotulo: "Reprovadas", valor: (l) => l.reprovadas },
            { rotulo: "% das reprovações", valor: (l) => l.participacao },
          ]}
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
                <CabecalhoOrdenavel
                  label="Motivo"
                  coluna="motivo"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Reprovadas"
                  coluna="reprovadas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="% das reprovações"
                  coluna="participacao"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
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
  const colunas = useMemo(
    () =>
      colunasCruzamento<LinhaClienteColoader>(
        (l) => l.cliente,
        (l) => l.coloader,
      ),
    [],
  );
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(linhas, colunas);
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock
      title="Combinações importantes — Cliente × Coloader"
      description="Combinações com mais reprovações (desempate por volume)."
      action={<Search className="size-4 text-muted-foreground" />}
    >
      <div className="flex flex-col gap-3">
        <BotaoExportarTabela
          nomeArquivo="cruzamento-cliente-coloader"
          colunas={[
            { rotulo: "Dimensão 1", valor: (l) => l.cliente },
            { rotulo: "Dimensão 2", valor: (l) => l.coloader },
            { rotulo: "Rotas", valor: (l) => l.rotas },
            { rotulo: "Aprovadas", valor: (l) => l.aprovadas },
            { rotulo: "Reprovadas", valor: (l) => l.reprovadas },
            { rotulo: "Em análise", valor: (l) => l.emAnalise },
            { rotulo: "Conversão", valor: (l) => l.conversao },
          ]}
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
                <CabecalhoOrdenavel
                  label="Dimensão 1"
                  coluna="dim1"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Dimensão 2"
                  coluna="dim2"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Rotas"
                  coluna="rotas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Aprovadas"
                  coluna="aprovadas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Reprovadas"
                  coluna="reprovadas"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Em análise"
                  coluna="emAnalise"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="Conversão"
                  coluna="conversao"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
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
      </div>
    </PanelBlock>
  );
}
