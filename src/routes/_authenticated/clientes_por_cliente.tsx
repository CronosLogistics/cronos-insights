import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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

import { FiltroPeriodo } from "@/components/data/FiltroPeriodo";
import { useModalidadeFrete } from "@/lib/modalidade-frete";

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
  formatarDiferenca,
  formatarPct,
  type AnaliseCliente,
  type LinhaMotivo,
  type LinhaRanking,
  type LinhaRotaColoader,
} from "@/lib/customer-analysis";
import { getAnaliseCliente, getClienteLista } from "@/lib/customer-analysis-fn";
import { gerarAnosOpcoes } from "@/lib/filtro-periodo";
import { useTerminologia } from "@/lib/terminologia";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clientes_por_cliente")({
  head: () => ({
    meta: [
      { title: "Por cliente — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha analítica detalhada por cliente: indicadores, perfil do recorte, insights de pricing, rotas, coloaders, agentes e motivos de reprovação.",
      },
    ],
  }),
  component: PorClientePage,
});

const inteiro = (valor: number) => valor.toLocaleString("pt-BR");

const FILTRO_TODOS = "Todos";

const CLIENT_STORAGE_KEY = "cronos-insights:por-cliente:cliente";

function readSavedClient(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CLIENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveClient(cliente: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (cliente) localStorage.setItem(CLIENT_STORAGE_KEY, cliente);
    else localStorage.removeItem(CLIENT_STORAGE_KEY);
  } catch {
    // storage indisponível (modo privado, quota...)
  }
}

function PorClientePage() {
  const [cliente, setCliente] = useState<string | null>(() => readSavedClient());
  const [anos, setAnos] = useState<number[]>([]);
  const [meses, setMeses] = useState<number[]>([]);
  const modalidade = useModalidadeFrete();
  const anosOpcoes = useMemo(() => gerarAnosOpcoes(), []);

  const lista = useQuery({
    queryKey: ["cliente-lista"],
    queryFn: () => getClienteLista(),
    staleTime: 5 * 60 * 1000,
  });

  const analise = useQuery({
    queryKey: ["analise-cliente", cliente, anos, meses, modalidade],
    queryFn: () =>
      getAnaliseCliente({
        data: {
          cliente: cliente as string,
          anos,
          meses,
          modalidade,
        },
      }),
    enabled: Boolean(cliente),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    saveClient(cliente);
  }, [cliente]);

  // Descarta seleção salva se o cliente não existir mais na lista do produto.
  useEffect(() => {
    if (!lista.data || !cliente || cliente === FILTRO_TODOS) return;
    const existe = lista.data.some((opcao) => opcao.cliente === cliente);
    if (!existe) setCliente(null);
  }, [lista.data, cliente]);

  const resetKey = `${cliente ?? ""}|${anos.join(",")}|${meses.join(",")}`;

  return (
    <div className="w-full min-w-0 space-y-6">
      <ModuleIntro
        eyebrow="Inteligência"
        title="Por cliente"
        description="Selecione um cliente para reproduzir a ficha da aba CLIENTES da planilha: indicadores do recorte, perfil, insights de pricing, onde atuar e os rankings por rota, coloader, agente e motivo de reprovação. Os dados respeitam o produto do seu acesso e são calculados no servidor."
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
              Filtro de cliente
            </p>
            {lista.isPending ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <ClienteCombobox
                clientes={(lista.data ?? []).map((opcao) => opcao.cliente)}
                value={cliente}
                onValueChange={setCliente}
              />
            )}
          </div>

          {lista.data ? (
            <Badge variant="secondary" className="w-fit">
              {inteiro(lista.data.length)} clientes no produto
            </Badge>
          ) : null}

          {lista.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar a lista de clientes.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!cliente ? (
        <EstadoVazio />
      ) : analise.isPending ? (
        <FichaSkeleton />
      ) : analise.isError ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Info className="size-4" />
          Não foi possível calcular a análise deste cliente.
        </p>
      ) : analise.data ? (
        <Ficha analise={analise.data} resetKey={resetKey} />
      ) : null}
    </div>
  );
}

function ClienteCombobox({
  clientes,
  value,
  onValueChange,
}: {
  clientes: string[];
  value: string | null;
  onValueChange: (cliente: string | null) => void;
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
    for (const opcao of clientes) {
      if (!opcao || vistos.has(opcao)) continue;
      vistos.add(opcao);
      lista.push(opcao);
    }
    return lista;
  }, [clientes]);

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
            placeholder="Digite ou selecione um cliente"
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
                aria-label="Limpar cliente"
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
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {filtrados.map((nome) => (
                <CommandItem
                  key={nome}
                  value={nome}
                  onSelect={() => selecionar(nome)}
                >
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
          <Building2 className="size-6 text-muted-foreground" />
        </span>
        <p className="text-sm font-medium">Selecione um cliente para visualizar a análise.</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          A ficha só é calculada após a escolha do cliente, evitando processar toda a base
          desnecessariamente.
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

function Ficha({ analise, resetKey }: { analise: AnaliseCliente; resetKey: string }) {
  const termos = useTerminologia();
  const { indicadores: ind, perfil } = analise;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PanelBlock
        title="Indicadores do recorte"
        description={`Cliente: ${analise.cliente}`}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock
          className="h-full"
          title="Perfil do recorte"
          description="Rotas e motivo mais relevantes do cliente."
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

        <TabelaMotivos linhas={analise.motivos} resetKey={`${resetKey}-motivos`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelBlock title="Insights de Pricing" description="Leitura automática dos indicadores.">
          <ListaInsights itens={analise.insightsPricing} />
        </PanelBlock>
        <PanelBlock title="Onde atuar" description="Prioridades sugeridas para o recorte.">
          <ListaInsights itens={analise.ondeAtuar} />
        </PanelBlock>
      </div>

      <TabelaRanking
        titulo="Rotas do cliente"
        descricao="Volume e conversão por rota (origem → destino)."
        rotuloItem="Rota"
        linhas={analise.rotas}
        resetKey={`${resetKey}-rotas`}
      />

      <TabelaRanking
        titulo="Coloaders do cliente"
        descricao={`Desempenho por ${termos.coloaderLabelMinusculo}.`}
        rotuloItem="Coloader"
        linhas={analise.coloaders}
        resetKey={`${resetKey}-coloaders`}
      />

      <TabelaRanking
        titulo="Agentes do cliente"
        descricao="Desempenho por agente no exterior."
        rotuloItem="Agente"
        linhas={analise.agentes}
        resetKey={`${resetKey}-agentes`}
      />

      <TabelaRotaColoader linhas={analise.rotaColoader} resetKey={`${resetKey}-rota-coloader`} />
    </div>
  );
}

type TomGrupo = "volume" | "resultado" | "performance";
type TomIcone = "padrao" | "positivo" | "negativo";

const tons: Record<
  TomGrupo,
  { cabecalho: string; icone: string }
> = {
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
                // 5 itens — desktop (≥sm): 3+2; mobile: 2+2+1 (último em linha cheia).
                cincoItens &&
                  (index < 3
                    ? "col-span-3 sm:col-span-2"
                    : ultimo
                      ? "col-span-6 sm:col-span-3"
                      : "col-span-3"),
                // Qualquer grade 2 colunas: se sobrar ímpar, o último ocupa a linha.
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
        Sem dados para este cliente.
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
    <PanelBlock title={titulo} description={descricao}>
      <div className="flex flex-col gap-3">
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
        <PaginatedContent pageKey={paginacao.pageKey} direction={paginacao.transicao} className="overflow-x-auto">
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
      description="Distribuição das reprovações do cliente por motivo."
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
        <PaginatedContent pageKey={paginacao.pageKey} direction={paginacao.transicao} className="overflow-x-auto">
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

function TabelaRotaColoader({
  linhas,
  resetKey,
}: {
  linhas: LinhaRotaColoader[];
  resetKey: string;
}) {
  const colunas = useMemo(
    () =>
      colunasCruzamento<LinhaRotaColoader>(
        (l) => l.rota,
        (l) => l.coloader,
      ),
    [],
  );
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(linhas, colunas);
  const paginacao = usePaginacao(ordenadas, `${resetKey}:${chaveReset}`);
  return (
    <PanelBlock
      title="Onde estamos perdendo? — Rota × Coloader"
      description="Combinações com mais reprovações (desempate por volume)."
      action={<Search className="size-4 text-muted-foreground" />}
    >
      <div className="flex flex-col gap-3">
        <BotaoExportarTabela
          nomeArquivo="cruzamento-rota-coloader"
          colunas={[
            { rotulo: "Rota", valor: (l) => l.rota },
            { rotulo: "Coloader", valor: (l) => l.coloader },
            { rotulo: "Rotas", valor: (l) => l.rotas },
            { rotulo: "Aprovadas", valor: (l) => l.aprovadas },
            { rotulo: "Reprovadas", valor: (l) => l.reprovadas },
            { rotulo: "Em análise", valor: (l) => l.emAnalise },
            { rotulo: "Conversão", valor: (l) => l.conversao },
          ]}
          linhas={ordenadas}
        />
        <PaginatedContent pageKey={paginacao.pageKey} direction={paginacao.transicao} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <CabecalhoOrdenavel
                  label="Rota"
                  coluna="dim1"
                  ordenacao={ordenacao}
                  onOrdenar={alternar}
                />
                <CabecalhoOrdenavel
                  label="Coloader"
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
                <TableRow key={`${linha.rota}-${linha.coloader}-${paginacao.inicio + i}`}>
                  <TableCell className="max-w-[220px] truncate">{linha.rota}</TableCell>
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
