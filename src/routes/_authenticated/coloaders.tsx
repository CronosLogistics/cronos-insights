import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/coloaders")({
  head: () => ({
    meta: [
      { title: "Coloaders e Armadores — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha do coloader/armador: participação nas ofertas, conversão por rota e competitividade.",
      },
      { property: "og:title", content: "Coloaders e Armadores — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Desempenho de coloaders e armadores nas cotações de Pricing.",
      },
    ],
  }),
  component: ColoadersPage,
});

function ColoadersPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Inteligência"
      title="Ficha do coloader / armador"
      description="Avaliação dos parceiros de transporte a partir do relatório de Ofertas: participação nas cotações, aprovações e reprovações, conversão, rotas atendidas e TEUS cotados."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Parceiros cotados",
          value: (kpis.data?.coloaders ?? 0).toLocaleString("pt-BR"),
          hint: "Armadores e coloaders",
        },
        {
          label: "Ofertas atribuídas",
          value: (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR"),
          hint: "Registros importados",
        },
        {
          label: "Conversão geral",
          value: `${(kpis.data?.conversao_pct ?? 0).toLocaleString("pt-BR")}%`,
          hint: "Aprovadas sobre decididas",
        },
        {
          label: "Rotas atendidas",
          value: (kpis.data?.rotas ?? 0).toLocaleString("pt-BR"),
          hint: "Rotas distintas na base",
        },
      ]}
      queryKey="coloaders"
      fetchRows={async (busca) => {
        let query = supabase
          .from("v_coloaders")
          .select("*")
          .order("ofertas", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("coloader", `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="coloader"
      campoValor="ofertas"
      buscaPlaceholder="Buscar coloader ou armador"
      chartTitle="Participação por parceiro"
      chartDescription="Dez parceiros com mais ofertas na base."
      tableTitle="Ranking de coloaders"
      tableDescription="Volume, conversão e cobertura de rotas por parceiro."
      colunas={[
        { key: "coloader", label: "Coloader / Armador" },
        { key: "ofertas", label: "Ofertas", tipo: "numero" },
        { key: "aprovadas", label: "Aprovadas", tipo: "numero" },
        { key: "reprovadas", label: "Reprovadas", tipo: "numero" },
        { key: "conversao_pct", label: "Conversão", tipo: "pct" },
        { key: "rotas", label: "Rotas", tipo: "numero" },
        { key: "teus", label: "TEUS", tipo: "decimal" },
      ]}
    />
  );
}
