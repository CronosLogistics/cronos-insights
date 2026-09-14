import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Database, RefreshCw } from "lucide-react";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

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

const PAGE_SIZE = 50;

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
    queryKey: ["ofertas-lista", busca, modalidade, analise],
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
        description="Cinquenta ofertas mais recentes conforme os filtros aplicados."
        action={
          <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
            <Database className="size-3" />
            Dados reais
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oferta</TableHead>
                    <TableHead>Rev.</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origem → Destino</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Abertura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.data!.map((row) => (
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
                  {lista.data!.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        Nenhuma oferta encontrada com os filtros atuais.
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
