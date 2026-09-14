import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/rotas")({
  head: () => ({
    meta: [
      { title: "Rotas — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha de inteligência da rota: países e portos de origem e destino, alternativas e conversão.",
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

function RotasPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Inteligência"
      title="Ficha de inteligência da rota"
      description="Análise por porto e país de origem e destino, com volume de ofertas, decisões, conversão, clientes atendidos e TEUS movimentados, a partir do relatório corporativo de Ofertas."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Rotas analisadas",
          value: (kpis.data?.rotas ?? 0).toLocaleString("pt-BR"),
          hint: "Combinações origem/destino",
        },
        {
          label: "Ofertas na base",
          value: (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR"),
          hint: "Ofertas e revisões",
        },
        {
          label: "Conversão geral",
          value: `${(kpis.data?.conversao_pct ?? 0).toLocaleString("pt-BR")}%`,
          hint: "Aprovadas sobre decididas",
        },
        {
          label: "TEUS cotados",
          value: (kpis.data?.teus ?? 0).toLocaleString("pt-BR"),
          hint: "Somatório do período",
        },
      ]}
      queryKey="rotas"
      fetchRows={async (busca) => {
        let query = supabase
          .from("v_rotas")
          .select("*")
          .order("ofertas", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("rota", `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="rota"
      campoValor="ofertas"
      buscaPlaceholder="Buscar rota (ex.: SANTOS)"
      chartTitle="Rotas com maior volume"
      chartDescription="Dez rotas com mais ofertas na base."
      tableTitle="Ranking de rotas"
      tableDescription="Volume, decisões, conversão e cobertura por rota."
      colunas={[
        { key: "origem", label: "Origem" },
        { key: "pais_origem", label: "País origem" },
        { key: "destino", label: "Destino" },
        { key: "pais_destino", label: "País destino" },
        { key: "ofertas", label: "Ofertas", tipo: "numero" },
        { key: "aprovadas", label: "Aprovadas", tipo: "numero" },
        { key: "reprovadas", label: "Reprovadas", tipo: "numero" },
        { key: "conversao_pct", label: "Conversão", tipo: "pct" },
        { key: "clientes", label: "Clientes", tipo: "numero" },
        { key: "teus", label: "TEUS", tipo: "decimal" },
      ]}

    />
  );
}
