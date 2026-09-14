import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/vendedores")({
  head: () => ({
    meta: [
      { title: "Vendedores — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Desempenho comercial por vendedor e inside sales: solicitações, conversão e carteira.",
      },
      { property: "og:title", content: "Vendedores — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Conversão comercial por vendedor e responsável de inside sales.",
      },
    ],
  }),
  component: VendedoresPage,
});

function VendedoresPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Pessoas"
      title="Desempenho comercial"
      description="Visão por vendedor com dados do relatório de Ofertas: solicitações de cotação, aprovações e reprovações, taxa de conversão, carteira de clientes e rotas atendidas."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Vendedores ativos",
          value: (kpis.data?.vendedores ?? 0).toLocaleString("pt-BR"),
          hint: "Vendedores na base",
        },
        {
          label: "Solicitações",
          value: (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR"),
          hint: "Ofertas e revisões",
        },
        {
          label: "Aprovadas",
          value: (kpis.data?.aprovadas ?? 0).toLocaleString("pt-BR"),
          hint: "Decisões favoráveis",
        },
        {
          label: "Conversão geral",
          value: `${(kpis.data?.conversao_pct ?? 0).toLocaleString("pt-BR")}%`,
          hint: "Aprovadas sobre decididas",
        },
      ]}
      queryKey="vendedores"
      fetchRows={async (busca) => {
        let query = supabase
          .from("v_vendedores")
          .select("*")
          .order("ofertas", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("vendedor", `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="vendedor"
      campoValor="ofertas"
      buscaPlaceholder="Buscar vendedor"
      chartTitle="Solicitações por vendedor"
      chartDescription="Dez vendedores com mais cotações na base."
      tableTitle="Ranking comercial"
      tableDescription="Volume, conversão e carteira atendida por vendedor."
      colunas={[
        { key: "vendedor", label: "Vendedor" },
        { key: "ofertas", label: "Solicitações", tipo: "numero" },
        { key: "aprovadas", label: "Aprovadas", tipo: "numero" },
        { key: "reprovadas", label: "Reprovadas", tipo: "numero" },
        { key: "conversao_pct", label: "Conversão", tipo: "pct" },
        { key: "clientes", label: "Clientes", tipo: "numero" },
        { key: "rotas", label: "Rotas", tipo: "numero" },
      ]}
    />
  );
}
