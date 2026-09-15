import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Info, Search } from "lucide-react";

import { KpiCard } from "@/components/data/KpiCard";
import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, usePaginacao } from "@/components/data/TablePagination";
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
  formatarPct,
  type AnaliseCliente,
  type LinhaMotivo,
  type LinhaRanking,
  type LinhaRotaColoader,
} from "@/lib/customer-analysis";
import { getAnaliseCliente, getClienteLista } from "@/lib/customer-analysis-fn";

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

function diferencaTexto(diferenca: number): string {
  const sinal = diferenca > 0 ? "+" : "";
  return `${sinal}${(diferenca * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} p.p.`;
}

function PorClientePage() {
  const [cliente, setCliente] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["cliente-lista"],
    queryFn: () => getClienteLista(),
    staleTime: 5 * 60 * 1000,
  });

  const analise = useQuery({
    queryKey: ["analise-cliente", cliente],
    queryFn: () => getAnaliseCliente({ data: { cliente: cliente as string } }),
    enabled: Boolean(cliente),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Inteligência"
        title="Por cliente"
        description="Selecione um cliente para reproduzir a ficha da aba CLIENTES da planilha: indicadores do recorte, perfil, insights de pricing, onde atuar e os rankings por rota, coloader, agente e motivo de reprovação. Os dados respeitam o produto do seu acesso e são calculados no servidor."
      />

      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Cliente
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-md">
              {lista.isPending ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <Select value={cliente ?? ""} onValueChange={setCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(lista.data ?? []).map((opcao) => (
                      <SelectItem key={opcao.cliente} value={opcao.cliente}>
                        {opcao.cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {lista.data ? (
              <Badge variant="secondary" className="w-fit">
                {inteiro(lista.data.length)} clientes no produto
              </Badge>
            ) : null}
          </div>
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
        <Ficha analise={analise.data} />
      ) : null}
    </div>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
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

function Ficha({ analise }: { analise: AnaliseCliente }) {
  const { indicadores: ind, perfil } = analise;

  return (
    <div className="space-y-6">
      <PanelBlock
        title="Indicadores do recorte"
        description={`Cliente: ${analise.cliente}`}
        action={
          <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
            Dados reais
          </Badge>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Rotas" value={inteiro(ind.rotas)} hint="Linhas do recorte" />
          <KpiCard label="Ofertas" value={inteiro(ind.ofertas)} hint="Ofertas distintas" />
          <KpiCard label="Aprovadas" value={inteiro(ind.aprovadas)} />
          <KpiCard label="Reprovadas" value={inteiro(ind.reprovadas)} />
          <KpiCard label="Em análise" value={inteiro(ind.emAnalise)} />
          <KpiCard label="Taxa de aprovação" value={formatarPct(ind.taxaAprovacao)} />
          <KpiCard label="Taxa de reprovação" value={formatarPct(ind.taxaReprovacao)} />
          <KpiCard label="Clientes" value={inteiro(ind.clientes)} />
          <KpiCard label="Rotas distintas" value={inteiro(ind.rotasDistintas)} />
          <KpiCard label="Coloaders" value={inteiro(ind.coloaders)} />
          <KpiCard label="Conversão recorte" value={formatarPct(ind.conversaoRecorte)} />
          <KpiCard label="Média geral" value={formatarPct(ind.mediaGeral)} hint="Base do produto" />
          <KpiCard label="Diferença" value={diferencaTexto(ind.diferenca)} hint="Recorte − média" />
          <KpiCard label="Decisões" value={inteiro(ind.decisoes)} hint="Aprovadas + reprovadas" />
        </div>
      </PanelBlock>

      <PanelBlock
        title="Perfil do recorte"
        description="Rotas e motivo mais relevantes do cliente."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <PerfilCard titulo="Mais recorrente" valor={perfil.maisRecorrente} />
          <PerfilCard titulo="Mais aprovações" valor={perfil.maisAprovacoes} />
          <PerfilCard titulo="Mais reprovações" valor={perfil.maisReprovacoes} />
          <PerfilCard titulo="Melhor conversão" valor={perfil.melhorConversao} />
          <PerfilCard titulo="Pior conversão" valor={perfil.piorConversao} />
          <PerfilCard titulo="Principal motivo" valor={perfil.principalMotivo} />
        </div>
      </PanelBlock>

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
        resetKey={analise.cliente}
      />

      <TabelaRanking
        titulo="Coloaders do cliente"
        descricao="Desempenho por coloader/armador."
        rotuloItem="Coloader"
        linhas={analise.coloaders}
        resetKey={analise.cliente}
      />

      <TabelaRanking
        titulo="Agentes do cliente"
        descricao="Desempenho por agente no exterior."
        rotuloItem="Agente"
        linhas={analise.agentes}
        resetKey={analise.cliente}
      />

      <TabelaMotivos linhas={analise.motivos} resetKey={analise.cliente} />

      <TabelaRotaColoader linhas={analise.rotaColoader} resetKey={analise.cliente} />
    </div>
  );
}

function PerfilCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {titulo}
        </p>
        <p className="text-sm font-semibold leading-snug">{valor}</p>
      </CardContent>
    </Card>
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
  const paginacao = usePaginacao(linhas, resetKey);
  return (
    <PanelBlock title={titulo} description={descricao}>
      <div className="overflow-x-auto">
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
      title="Motivos de reprovação"
      description="Distribuição das reprovações do cliente por motivo."
    >
      <div className="overflow-x-auto">
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
  const paginacao = usePaginacao(linhas, resetKey);
  return (
    <PanelBlock
      title="Onde estamos perdendo? — Rota × Coloader"
      description="Combinações com mais reprovações (desempate por volume)."
      action={<Search className="size-4 text-muted-foreground" />}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rota</TableHead>
              <TableHead>Coloader</TableHead>
              <TableHead className="text-right">Rotas</TableHead>
              <TableHead className="text-right">Aprovadas</TableHead>
              <TableHead className="text-right">Reprovadas</TableHead>
              <TableHead className="text-right">Em análise</TableHead>
              <TableHead className="text-right">Conversão</TableHead>
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
    </PanelBlock>
  );
}
