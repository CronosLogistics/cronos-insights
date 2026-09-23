import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database } from "lucide-react";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, PaginatedContent, usePaginacao } from "@/components/data/TablePagination";
import { BotaoExportarTabela } from "@/components/data/table-export";
import {
  CabecalhoOrdenavel,
  useOrdenacaoTabela,
} from "@/components/data/table-sort";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataHora } from "@/lib/analytics";
import { usePerfil } from "@/hooks/useProduto";

const COLUNAS_IMPORTACOES = {
  fonte: { tipo: "texto" as const },
  iniciado_em: { tipo: "texto" as const },
  concluido_em: { tipo: "texto" as const },
  linhas: { tipo: "numero" as const },
  situacao: { tipo: "texto" as const },
};

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Cronos Pricing Insights" },
      {
        name: "description",
        content: "Histórico das cargas do relatório de Ofertas mantido no OneDrive.",
      },
      { property: "og:title", content: "Configurações — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Histórico das cargas do relatório de Ofertas.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const perfil = usePerfil();
  if (perfil.isPending) return <Skeleton className="h-64 w-full" />;
  if (!perfil.data?.isAdmin) {
    return (
      <PanelBlock
        title="Acesso restrito"
        description="As configurações estão disponíveis apenas para administradores."
      >
        <p className="text-sm text-muted-foreground">
          Solicite acesso a um administrador, se necessário.
        </p>
      </PanelBlock>
    );
  }
  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Administração"
        title="Configurações"
        description="Histórico das cargas do relatório de Ofertas."
      />

      <HistoricoImportacoes />
    </div>
  );
}

function HistoricoImportacoes() {
  const importacoes = useQuery({
    queryKey: ["importacoes-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("importacoes")
        .select("*")
        .order("iniciado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { ordenadas, ordenacao, alternar, chaveReset } = useOrdenacaoTabela(
    importacoes.data,
    COLUNAS_IMPORTACOES,
  );
  const paginacao = usePaginacao(ordenadas, `importacoes-historico:${chaveReset}`);

  return (
    <PanelBlock
      title="Histórico de cargas"
      description="Cargas do relatório de Ofertas mantido no OneDrive."
      action={
        <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
          <Database className="size-3" />
          Dados reais
        </Badge>
      }
    >
      {importacoes.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <BotaoExportarTabela
            nomeArquivo="historico-cargas"
            colunas={[
              { rotulo: "Fonte", valor: (l) => l.fonte },
              { rotulo: "Início", valor: (l) => l.iniciado_em },
              { rotulo: "Conclusão", valor: (l) => l.concluido_em },
              { rotulo: "Linhas", valor: (l) => l.linhas },
              { rotulo: "Situação", valor: (l) => l.situacao },
            ]}
            linhas={ordenadas}
          />
          <PaginatedContent pageKey={paginacao.pageKey} direction={paginacao.transicao} className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <CabecalhoOrdenavel
                    label="Fonte"
                    coluna="fonte"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                  />
                  <CabecalhoOrdenavel
                    label="Início"
                    coluna="iniciado_em"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                  />
                  <CabecalhoOrdenavel
                    label="Conclusão"
                    coluna="concluido_em"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                  />
                  <CabecalhoOrdenavel
                    label="Linhas"
                    coluna="linhas"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                    align="right"
                  />
                  <CabecalhoOrdenavel
                    label="Situação"
                    coluna="situacao"
                    ordenacao={ordenacao}
                    onOrdenar={alternar}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginacao.visiveis.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[220px] truncate">{item.fonte}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatarDataHora(item.iniciado_em)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatarDataHora(item.concluido_em)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.linhas ? item.linhas.toLocaleString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {item.situacao}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {paginacao.total === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma carga registrada.
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
        </div>
      )}
    </PanelBlock>
  );
}
