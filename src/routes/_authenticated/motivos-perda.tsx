import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Info,
  Network,
  Route as RouteIcon,
  Ship,
  Target,
  TrendingDown,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { FiltroPeriodo } from "@/components/data/FiltroPeriodo";
import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { BotaoExportarTabela } from "@/components/data/table-export";
import {
  CabecalhoOrdenavel,
  useOrdenacaoTabela,
} from "@/components/data/table-sort";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import { Badge } from "@/components/ui/badge";
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
  formatarMesRotulo,
  formatarPct,
  type AnaliseMotivosPerda,
  type LinhaEvolucaoMensal,
  type LinhaMotivoDimensao,
  type LinhaRotaCliente,
} from "@/lib/motivos-perda-analysis";
import {
  getAnaliseMotivosPerda,
  getMotivosPerdaOpcoesFiltro,
} from "@/lib/motivos-perda-analysis-fn";
import { gerarAnosOpcoes } from "@/lib/filtro-periodo";
import { cn } from "@/lib/utils";

const COLUNAS_DIMENSAO = {
  item: { tipo: "texto" as const },
  reprovacoes: { tipo: "numero" as const },
  pctMotivo: { tipo: "numero" as const },
};

const COLUNAS_ROTA_CLIENTE = {
  rota: { tipo: "texto" as const },
  cliente: { tipo: "texto" as const },
  reprovacoes: { tipo: "numero" as const },
};

const COLUNAS_EVOLUCAO = {
  mes: { tipo: "texto" as const },
  reprovacoes: { tipo: "numero" as const },
  pctMes: { tipo: "numero" as const },
};

export const Route = createFileRoute("/_authenticated/motivos-perda")({
  head: () => ({
    meta: [
      { title: "Motivos de Perda — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Inteligência de motivos de reprovação: concentração por rota, cliente, coloader, agente e evolução mensal.",
      },
      { property: "og:title", content: "Motivos de Perda — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Diagnóstico das reprovações de cotações de Pricing.",
      },
    ],
  }),
  component: MotivosPage,
});

const inteiro = (valor: number) => valor.toLocaleString("pt-BR");

const MOTIVO_STORAGE_KEY = "cronos-insights:motivos-perda:selecao";

function readSavedMotivo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(MOTIVO_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveMotivo(motivo: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (motivo) localStorage.setItem(MOTIVO_STORAGE_KEY, motivo);
    else localStorage.removeItem(MOTIVO_STORAGE_KEY);
  } catch {
    // storage indisponível
  }
}

function MotivosPage() {
  const [motivo, setMotivo] = useState<string | null>(() => readSavedMotivo());
  const [anos, setAnos] = useState<number[]>([]);
  const [meses, setMeses] = useState<number[]>([]);
  const anosOpcoes = useMemo(() => gerarAnosOpcoes(), []);

  const opcoes = useQuery({
    queryKey: ["motivos-perda-opcoes-filtro"],
    queryFn: () => getMotivosPerdaOpcoesFiltro(),
    staleTime: 5 * 60 * 1000,
  });

  const analise = useQuery({
    queryKey: ["analise-motivos-perda", motivo, anos, meses],
    queryFn: () =>
      getAnaliseMotivosPerda({
        data: {
          motivo: motivo as string,
          anos,
          meses,
        },
      }),
    enabled: Boolean(motivo),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    saveMotivo(motivo);
  }, [motivo]);

  useEffect(() => {
    if (!opcoes.data || !motivo || motivo === FILTRO_TODOS) return;
    const existe = opcoes.data.motivos.some((opcao) => opcao === motivo);
    if (!existe) setMotivo(null);
  }, [opcoes.data, motivo]);

  const resetKey = `${motivo ?? ""}|${anos.join(",")}|${meses.join(",")}`;

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Diagnóstico"
        title="Motivos de Perda"
        description="Somente reprovações | concentração por rota, cliente, coloader, agente e evolução mensal."
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Pesquisa
          </p>

          <FiltroPeriodo
            anos={anos}
            meses={meses}
            onAnosChange={setAnos}
            onMesesChange={setMeses}
            anosOpcoes={anosOpcoes}
            className="max-w-xl"
          />

          <div className="max-w-xl space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Motivos de reprovação
            </p>
            <FiltroMotivoCombobox
              value={motivo}
              onValueChange={setMotivo}
              opcoes={opcoes.data?.motivos ?? []}
              carregando={opcoes.isPending}
            />
          </div>

          {opcoes.data ? (
            <Badge variant="secondary" className="w-fit">
              {inteiro(opcoes.data.motivos.length)} motivos no produto
            </Badge>
          ) : null}

          {opcoes.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar as opções de filtro.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!motivo ? (
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

function FiltroMotivoCombobox({
  value,
  onValueChange,
  opcoes,
  carregando,
}: {
  value: string | null;
  onValueChange: (valor: string | null) => void;
  opcoes: string[];
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
    for (const opcao of opcoes) {
      if (!opcao || vistos.has(opcao)) continue;
      vistos.add(opcao);
      lista.push(opcao);
    }
    return lista;
  }, [opcoes]);

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
    return <Skeleton className="h-9 w-full rounded-md" />;
  }

  return (
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
            placeholder="Digite ou selecione um motivo"
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
                aria-label="Limpar motivo"
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
            <CommandEmpty>Nenhum motivo encontrado.</CommandEmpty>
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
  );
}

function EstadoVazio() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <TrendingDown className="size-6 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium">Selecione um motivo para visualizar a análise.</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          A ficha só é calculada após a escolha do motivo, evitando processar toda a base
          desnecessariamente.
        </p>
      </CardContent>
    </Card>
  );
}

function FichaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
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
      {Array.from({ length: 3 }).map((_, i) => (
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

function Ficha({ analise, resetKey }: { analise: AnaliseMotivosPerda; resetKey: string }) {
  const { indicadores: ind, perfil } = analise;
  const semDados = ind.reprovacoes === 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PanelBlock
        title="Resumo de reprovações"
        description={
          analise.motivo === FILTRO_TODOS
            ? "Recorte de todas as reprovações do produto."
            : `Motivo: ${analise.motivo}`
        }
        action={
          <Badge className="border-transparent bg-accent text-accent-foreground hover:bg-accent">
            Dados reais
          </Badge>
        }
      >
        <div className="grid w-full min-w-0 gap-3 md:grid-cols-2">
          <GrupoIndicadores
            titulo="Volume"
            tom="volume"
            itens={[
              {
                titulo: "Reprovações",
                valor: inteiro(ind.reprovacoes),
                icone: TrendingDown,
                tomIcone: "negativo",
              },
              {
                titulo: "% das reprovações",
                valor: formatarPct(ind.pctReprovacoes),
                icone: Target,
              },
              {
                titulo: "Amostra",
                valor: inteiro(ind.amostra),
                icone: AlertTriangle,
              },
              {
                titulo: "Status",
                valor: ind.status,
                icone: Info,
              },
              {
                titulo: "Recorte",
                valor: ind.recorte,
                icone: Target,
              },
            ]}
          />
          <GrupoIndicadores
            titulo="Cobertura"
            tom="resultado"
            itens={[
              { titulo: "Rotas", valor: inteiro(ind.rotas), icone: RouteIcon },
              { titulo: "Clientes", valor: inteiro(ind.clientes), icone: Building2 },
              { titulo: "Coloaders", valor: inteiro(ind.coloaders), icone: Ship },
              { titulo: "Agentes", valor: inteiro(ind.agentes), icone: Users },
              { titulo: "Meses", valor: inteiro(ind.meses), icone: CalendarDays },
            ]}
          />
        </div>
      </PanelBlock>

      {semDados ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <TrendingDown className="size-6 text-muted-foreground" />
            </span>
            <p className="text-sm font-medium">Nenhuma reprovação no recorte selecionado.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Selecione outro motivo ou limpe o filtro para escolher novamente.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <PanelBlock
        title="Perfil do motivo"
        description="Dimensões com maior concentração de reprovações no recorte."
      >
        <ul className="divide-y divide-border/60">
          {[
            { titulo: "Principal rota", valor: perfil.principalRota },
            { titulo: "Principal cliente", valor: perfil.principalCliente },
            { titulo: "Principal coloader", valor: perfil.principalColoader },
            { titulo: "Principal agente", valor: perfil.principalAgente },
          ].map((item) => (
            <li
              key={item.titulo}
              className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="w-44 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {item.titulo}
              </span>
              <span className="text-sm font-medium leading-snug">{item.valor}</span>
            </li>
          ))}
        </ul>
      </PanelBlock>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock title="Insights de pricing" description="Leitura automática do recorte.">
          <ListaInsights itens={analise.insightsPricing} />
        </PanelBlock>
        <PanelBlock title="Onde atuar" description="Prioridades sugeridas para o motivo.">
          <ListaInsights itens={analise.ondeAtuar} />
        </PanelBlock>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TabelaDimensao
          titulo="Motivo × rota"
          descricao="Rotas associadas ao motivo (até 10)."
          rotuloItem="Rota"
          linhas={analise.motivoRota}
          resetKey={`${resetKey}-rota`}
        />
        <TabelaDimensao
          titulo="Motivo × cliente"
          descricao="Clientes associados ao motivo (até 10)."
          rotuloItem="Cliente"
          linhas={analise.motivoCliente}
          resetKey={`${resetKey}-cliente`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TabelaDimensao
          titulo="Coloaders associados"
          descricao="Coloaders com mais reprovações no motivo (até 10)."
          rotuloItem="Coloader"
          linhas={analise.coloaders}
          resetKey={`${resetKey}-coloader`}
        />
        <TabelaDimensao
          titulo="Agentes associados"
          descricao="Agentes com mais reprovações no motivo (até 10)."
          rotuloItem="Agente"
          linhas={analise.agentes}
          resetKey={`${resetKey}-agente`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TabelaRotaCliente
          linhas={analise.rotaCliente}
          resetKey={`${resetKey}-rota-cliente`}
        />
        <TabelaEvolucao
          linhas={analise.evolucaoMensal}
          resetKey={`${resetKey}-evolucao`}
        />
      </div>
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

function TabelaDimensao({
  titulo,
  descricao,
  rotuloItem,
  linhas,
  resetKey,
}: {
  titulo: string;
  descricao: string;
  rotuloItem: string;
  linhas: LinhaMotivoDimensao[];
  resetKey: string;
}) {
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(
    linhas,
    COLUNAS_DIMENSAO,
  );
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock className="h-full" title={titulo} description={descricao}>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <BotaoExportarTabela
          nomeArquivo={`motivo-${rotuloItem.toLocaleLowerCase("pt-BR")}`}
          colunas={[
            { rotulo: rotuloItem, valor: (l) => l.item },
            { rotulo: "Reprovações", valor: (l) => l.reprovacoes },
            { rotulo: "% do motivo", valor: (l) => l.pctMotivo },
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
                  label="Reprovações"
                  coluna="reprovacoes"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="% do motivo"
                  coluna="pctMotivo"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginacao.visiveis.map((linha, i) => (
                <TableRow key={`${linha.item}-${paginacao.inicio + i}`}>
                  <TableCell className="max-w-[320px] truncate">{linha.item}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.reprovacoes)}</TableCell>
                  <TableCell className="text-right">{formatarPct(linha.pctMotivo)}</TableCell>
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

function TabelaRotaCliente({
  linhas,
  resetKey,
}: {
  linhas: LinhaRotaCliente[];
  resetKey: string;
}) {
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(
    linhas,
    COLUNAS_ROTA_CLIENTE,
  );
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock
      className="h-full"
      title="Rota × cliente"
      description="Combinações com mais reprovações no motivo (até 10)."
      action={<Network className="size-4 text-muted-foreground" />}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <BotaoExportarTabela
          nomeArquivo="cruzamento-rota-cliente"
          colunas={[
            { rotulo: "Rota", valor: (l) => l.rota },
            { rotulo: "Cliente", valor: (l) => l.cliente },
            { rotulo: "Reprovações", valor: (l) => l.reprovacoes },
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
                  label="Rota"
                  coluna="rota"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Cliente"
                  coluna="cliente"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Reprovações"
                  coluna="reprovacoes"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginacao.visiveis.map((linha, i) => (
                <TableRow key={`${linha.rota}-${linha.cliente}-${paginacao.inicio + i}`}>
                  <TableCell className="max-w-[220px] truncate">{linha.rota}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{linha.cliente}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.reprovacoes)}</TableCell>
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

function TabelaEvolucao({
  linhas,
  resetKey,
}: {
  linhas: LinhaEvolucaoMensal[];
  resetKey: string;
}) {
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(
    linhas,
    COLUNAS_EVOLUCAO,
  );
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock
      className="h-full"
      title="Evolução mensal"
      description="% das reprovações do mês atribuídas ao motivo selecionado."
      action={<CalendarDays className="size-4 text-muted-foreground" />}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
        <BotaoExportarTabela
          nomeArquivo="evolucao-mensal"
          colunas={[
            { rotulo: "Mês", valor: (l) => formatarMesRotulo(l.mes) },
            { rotulo: "Reprovações", valor: (l) => l.reprovacoes },
            { rotulo: "% das reprovações do mês", valor: (l) => l.pctMes },
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
                  label="Mês"
                  coluna="mes"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Reprovações"
                  coluna="reprovacoes"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
                <CabecalhoOrdenavel
                  label="% das reprovações do mês"
                  coluna="pctMes"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                  align="right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginacao.visiveis.map((linha, i) => (
                <TableRow key={`${linha.mes}-${paginacao.inicio + i}`}>
                  <TableCell>{formatarMesRotulo(linha.mes)}</TableCell>
                  <TableCell className="text-right">{inteiro(linha.reprovacoes)}</TableCell>
                  <TableCell className="text-right">{formatarPct(linha.pctMes)}</TableCell>
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
