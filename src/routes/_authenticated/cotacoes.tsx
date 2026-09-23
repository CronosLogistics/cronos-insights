import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";

import { FiltroPeriodo } from "@/components/data/FiltroPeriodo";
import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import { BotaoExportarTabela } from "@/components/data/table-export";
import {
  CabecalhoOrdenavel,
  useOrdenacaoTabela,
  type ColunasOrdenacao,
} from "@/components/data/table-sort";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { gerarAnosOpcoes } from "@/lib/filtro-periodo";

export const Route = createFileRoute("/_authenticated/cotacoes")({
  head: () => ({
    meta: [
      { title: "Cotações — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Carteira de cotações e ofertas importada do relatório corporativo: status, revisões, rota, modalidade e responsáveis.",
      },
      { property: "og:title", content: "Cotações — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Acompanhamento da carteira de ofertas de Pricing com dados do relatório oficial.",
      },
    ],
  }),
  component: CotacoesPage,
});

const PAGE_SIZE = 500;

type Oferta = {
  oferta: string;
  revisao: number | null;
  cliente: string | null;
  rota: string | null;
  modalidade: string | null;
  origem: string | null;
  destino: string | null;
  container: string | null;
  status: string | null;
  analise: string | null;
  vendedor: string | null;
  pricing: string | null;
  data_abertura: string | null;
};

const COLUNAS_OFERTAS: ColunasOrdenacao<Oferta> = {
  oferta: { tipo: "texto" },
  revisao: { tipo: "numero" },
  cliente: { tipo: "texto" },
  rota: {
    tipo: "texto",
    valor: (row) => `${row.origem ?? ""} → ${row.destino ?? ""}`,
  },
  modalidade: { tipo: "texto" },
  analise: { tipo: "texto" },
  vendedor: { tipo: "texto" },
  pricing: { tipo: "texto" },
  data_abertura: { tipo: "texto" },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="font-heading text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function CotacoesPage() {
  const [busca, setBusca] = useState("");
  const [modalidade, setModalidade] = useState("todas");
  const [analise, setAnalise] = useState("todas");
  const [anos, setAnos] = useState<number[]>([]);
  const [meses, setMeses] = useState<number[]>([]);
  const anosOpcoes = useMemo(() => gerarAnosOpcoes(), []);

  const resumo = useQuery({
    queryKey: ["ofertas-resumo"],
    queryFn: async () => {
      const [total, aberto, importacao] = await Promise.all([
        supabase.from("ofertas").select("*", { count: "exact", head: true }),
        supabase
          .from("ofertas")
          .select("*", { count: "exact", head: true })
          .eq("analise", "Em Aberto"),
        supabase
          .from("importacoes")
          .select("concluido_em, linhas, situacao")
          .order("iniciado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        total: total.count ?? 0,
        emAberto: aberto.count ?? 0,
        importacao: importacao.data,
      };
    },
  });

  const lista = useQuery({
    queryKey: ["ofertas-lista", busca, modalidade, analise, anos, meses],
    queryFn: async () => {
      let query = supabase
        .from("ofertas")
        .select(
          "oferta,revisao,cliente,rota,modalidade,origem,destino,container,status,analise,vendedor,pricing,data_abertura",
        )
        .order("data_abertura", { ascending: false, nullsFirst: false })
        .limit(PAGE_SIZE);

      const termo = busca.trim();
      if (termo) {
        query = query.or(`oferta.ilike.%${termo}%,cliente.ilike.%${termo}%`);
      }
      if (modalidade !== "todas") query = query.eq("modalidade", modalidade);
      if (analise !== "todas") query = query.eq("analise", analise);
      if (anos.length > 0) query = query.in("ano", anos);
      if (meses.length > 0) query = query.in("mes", meses);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Oferta[];
    },
  });

  const opcoes = useQuery({
    queryKey: ["ofertas-opcoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("modalidade,analise")
        .limit(5000);
      if (error) throw error;
      const modalidades = new Set<string>();
      const analises = new Set<string>();
      for (const row of data ?? []) {
        if (row.modalidade) modalidades.add(row.modalidade);
        if (row.analise) analises.add(row.analise);
      }
      return {
        modalidades: [...modalidades].sort(),
        analises: [...analises].sort(),
      };
    },
  });

  const ultimaAtualizacao = useMemo(() => {
    const iso = resumo.data?.importacao?.concluido_em;
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }, [resumo.data]);

  const filtrosKey = `${busca}|${modalidade}|${analise}|${anos.join(",")}|${meses.join(",")}`;
  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(
    lista.data,
    COLUNAS_OFERTAS,
  );
  const paginacao = usePaginacao(ordenadas, `${filtrosKey}:${chaveReset}`);

  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Carteira"
        title="Cotações e ofertas"
        description="Base de ofertas por cliente, rota, modalidade e incoterm, importada do relatório corporativo de Ofertas mantido no OneDrive."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ofertas e revisões"
          value={resumo.isPending ? "…" : resumo.data!.total.toLocaleString("pt-BR")}
          hint="Registros na base"
        />
        <KpiCard
          label="Em aberto"
          value={resumo.isPending ? "…" : resumo.data!.emAberto.toLocaleString("pt-BR")}
          hint="Sem decisão registrada"
        />
        <KpiCard label="Última atualização" value={ultimaAtualizacao} hint="Carga do relatório" />
        <KpiCard
          label="Fonte"
          value="Ofertas.xlsx"
          hint="OneDrive · BI / Base Relatórios / Gestão"
        />
      </div>

      <PanelBlock
        title="Base de ofertas"
        description="Ofertas mais recentes conforme os filtros aplicados, com paginação."
        action={
          <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
            <Database className="size-3" />
            Dados reais
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="max-w-xl space-y-3">
            <FiltroPeriodo
              anos={anos}
              meses={meses}
              onAnosChange={setAnos}
              onMesesChange={setMeses}
              anosOpcoes={anosOpcoes}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por oferta ou cliente"
              />
              <Select value={modalidade} onValueChange={setModalidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as modalidades</SelectItem>
                  {(opcoes.data?.modalidades ?? []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={analise} onValueChange={setAnalise}>
                <SelectTrigger>
                  <SelectValue placeholder="Situação da análise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as situações</SelectItem>
                  {(opcoes.data?.analises ?? []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {lista.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : lista.isError ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <RefreshCw className="size-4" />
              Não foi possível carregar as ofertas agora.
            </p>
          ) : (
            <>
              <BotaoExportarTabela
                nomeArquivo="cotacoes"
                colunas={[
                  { rotulo: "Oferta", valor: (l) => l.oferta },
                  { rotulo: "Rev.", valor: (l) => l.revisao },
                  { rotulo: "Cliente", valor: (l) => l.cliente },
                  {
                    rotulo: "Origem→Destino",
                    valor: (l) => `${l.origem ?? "—"} → ${l.destino ?? "—"}`,
                  },
                  { rotulo: "Modalidade", valor: (l) => l.modalidade },
                  { rotulo: "Situação", valor: (l) => l.analise },
                  { rotulo: "Vendedor", valor: (l) => l.vendedor },
                  { rotulo: "Pricing", valor: (l) => l.pricing },
                  { rotulo: "Abertura", valor: (l) => l.data_abertura },
                ]}
                linhas={ordenadas}
              />
              <PaginatedContent pageKey={paginacao.pageKey} direction={paginacao.transicao} className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <CabecalhoOrdenavel
                        label="Oferta"
                        coluna="oferta"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                      <CabecalhoOrdenavel
                        label="Rev."
                        coluna="revisao"
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
                        label="Origem → Destino"
                        coluna="rota"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                      <CabecalhoOrdenavel
                        label="Modalidade"
                        coluna="modalidade"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                      <CabecalhoOrdenavel
                        label="Situação"
                        coluna="analise"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                      <CabecalhoOrdenavel
                        label="Vendedor"
                        coluna="vendedor"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                      <CabecalhoOrdenavel
                        label="Pricing"
                        coluna="pricing"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                      <CabecalhoOrdenavel
                        label="Abertura"
                        coluna="data_abertura"
                        ordenacao={ordenacao}
                        onOrdenar={alternar}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginacao.visiveis.map((row) => (
                      <TableRow key={`${row.oferta}-${row.revisao ?? 0}`}>
                        <TableCell className="whitespace-nowrap font-medium">{row.oferta}</TableCell>
                        <TableCell>{row.revisao ?? "—"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {row.cliente ?? "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {(row.origem ?? "—") + " → " + (row.destino ?? "—")}
                        </TableCell>
                        <TableCell>{row.modalidade ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {row.analise ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          {row.vendedor ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">{row.pricing ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(row.data_abertura)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginacao.total === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Nenhuma oferta encontrada com os filtros atuais.
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
