import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/analistas")({
  head: () => ({
    meta: [
      { title: "Analistas de Pricing — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha do analista de Pricing: volume analisado, tempo de resposta e taxa de decisão.",
      },
      { property: "og:title", content: "Analistas de Pricing — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Produtividade e efetividade do time de Pricing.",
      },
    ],
  }),
  component: AnalistasPage,
});

function AnalistasPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Pessoas"
      title="Ficha do analista"
      description="Acompanhamento do time de Pricing com dados do relatório de Ofertas: cotações analisadas, decididas e em aberto, tempo médio de resposta e taxa de aprovação."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Analistas ativos",
          value: (kpis.data?.analistas ?? 0).toLocaleString("pt-BR"),
          hint: "Analistas com cotações",
        },
        {
          label: "Cotações analisadas",
          value: (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR"),
          hint: "Ofertas e revisões",
        },
        {
          label: "Tempo médio",
          value: `${(kpis.data?.tempo_medio_horas ?? 0).toLocaleString("pt-BR")} h`,
          hint: "Resposta do Pricing",
        },
        {
          label: "Conversão geral",
          value: `${(kpis.data?.conversao_pct ?? 0).toLocaleString("pt-BR")}%`,
          hint: "Aprovadas sobre decididas",
        },
      ]}
      queryKey="analistas"
      fetchRows={async (busca) => {
        let query = supabase
          .from("v_analistas")
          .select("*")
          .order("ofertas", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("analista", `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="analista"
      campoValor="ofertas"
      buscaPlaceholder="Buscar analista"
      chartTitle="Volume analisado por analista"
      chartDescription="Dez analistas com mais cotações na base."
      tableTitle="Desempenho por analista"
      tableDescription="Volume, decisões, tempo de resposta e conversão."
      colunas={[
        { key: "analista", label: "Analista" },
        { key: "ofertas", label: "Cotações", tipo: "numero" },
        { key: "decididas", label: "Decididas", tipo: "numero" },
        { key: "em_aberto", label: "Em aberto", tipo: "numero" },
        { key: "aprovadas", label: "Aprovadas", tipo: "numero" },
        { key: "conversao_pct", label: "Conversão", tipo: "pct" },
        { key: "tempo_medio_horas", label: "Tempo médio (h)", tipo: "decimal" },
      ]}
    />
  );
}
