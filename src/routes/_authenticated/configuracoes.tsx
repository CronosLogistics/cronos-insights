import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database } from "lucide-react";

import { ModuleIntro, PanelBlock } from "@/components/data/Placeholders";
import { TablePagination, usePaginacao } from "@/components/data/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatarDataHora } from "@/lib/analytics";
import { usePerfil, useProdutos } from "@/hooks/useProduto";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Parâmetros da análise de Pricing: períodos, regras de decisão, cadastros de apoio e acessos.",
      },
      { property: "og:title", content: "Configurações — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Parâmetros e cadastros de apoio da plataforma de Pricing.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

const groups = [
  {
    title: "Parâmetros de análise",
    description: "Período padrão, mínimo de decisões por dimensão e faixas de atenção.",
    rows: ["Período padrão", "Mínimo de decisões", "Faixas de atenção"],
  },
  {
    title: "Cadastros de apoio",
    description: "De/para de portos, agrupamento de clientes e normalização de coloaders.",
    rows: ["De/para de portos", "Agrupamento de clientes", "Normalização de coloaders"],
  },
  {
    title: "Cargas e histórico",
    description: "Origem dos arquivos, controle de importação e base histórica.",
    rows: ["Importações", "Controle de histórico", "Retenção"],
  },
];

function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <ModuleIntro
        eyebrow="Administração"
        title="Configurações"
        description="Área reservada para os parâmetros que sustentam a análise de Pricing. Nesta etapa apenas a estrutura visual está definida."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <PanelBlock
            key={group.title}
            title={group.title}
            description={group.description}
            action={<Badge variant="secondary">Em construção</Badge>}
          >
            <div className="space-y-3">
              {group.rows.map((row, index) => (
                <div key={row}>
                  {index > 0 ? <Separator className="mb-3" /> : null}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{row}</span>
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </PanelBlock>
        ))}
      </div>

      <AcessosProduto />

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

  const paginacao = usePaginacao(importacoes.data, "importacoes-historico");

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
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Conclusão</TableHead>
                  <TableHead className="text-right">Linhas</TableHead>
                  <TableHead>Situação</TableHead>
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
        </>
      )}
    </PanelBlock>
  );
}


/**
 * Acessos: cada usuário possui um Produto, que funciona como filtro
 * obrigatório dos dados em toda a aplicação. A restrição é garantida pelas
 * políticas de acesso do banco — aqui apenas administramos o vínculo.
 */
function AcessosProduto() {
  const perfil = usePerfil();
  const produtos = useProdutos();
  const queryClient = useQueryClient();

  const usuarios = useQuery({
    queryKey: ["perfis-acessos"],
    enabled: perfil.data?.isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis")
        .select("id,nome,email,produto_codigo")
        .order("email");
      if (error) throw error;
      return data ?? [];
    },
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, codigo }: { id: string; codigo: string }) => {
      const { error } = await supabase
        .from("perfis")
        .update({ produto_codigo: codigo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Produto do usuário atualizado");
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error("Não foi possível atualizar o produto", { description: error.message });
    },
  });

  const paginacao = usePaginacao(usuarios.data, "acessos-produto");

  if (perfil.isPending) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!perfil.data?.isAdmin) {
    return (
      <PanelBlock
        title="Acessos"
        description="Seu produto define os dados disponíveis em todas as telas."
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Produto associado ao seu acesso:</span>
          <Badge variant="outline" className="border-accent/40 text-accent">
            {perfil.data?.produtoNome ?? "não definido"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            A alteração é feita por um administrador.
          </span>
        </div>
      </PanelBlock>
    );
  }

  return (
    <PanelBlock
      title="Acessos e produto"
      description="Defina o produto de cada usuário. Ele é aplicado como filtro obrigatório dos dados em todas as telas."
      action={
        <Badge variant="outline" className="gap-1 border-accent/40 text-accent">
          <Database className="size-3" />
          Administração
        </Badge>
      }
    >
      {usuarios.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-64">Produto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginacao.visiveis.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[220px] truncate">{item.nome ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{item.email ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={item.produto_codigo ?? ""}
                        onValueChange={(codigo) => atualizar.mutate({ id: item.id, codigo })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {(produtos.data ?? []).map((produto) => (
                            <SelectItem key={produto.codigo} value={produto.codigo}>
                              {produto.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {paginacao.total === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : null}
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
        </>
      )}
    </PanelBlock>
  );
}
