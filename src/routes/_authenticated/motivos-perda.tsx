import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/motivos-perda")({
  head: () => ({
    meta: [
      { title: "Motivos de Perda — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Inteligência de motivos de reprovação: ranking por motivo, cliente, rota e coloader.",
      },
      { property: "og:title", content: "Motivos de Perda — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Diagnóstico das reprovações de cotações de Pricing.",
      },
    ],
  }),
  component: MotivosPage,
});

function MotivosPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Diagnóstico"
      title="Inteligência de motivos de reprovação"
      description="Análise das perdas registradas no relatório de Ofertas: motivo declarado, participação no total de reprovações e o cliente e a rota mais recorrentes em cada motivo."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Reprovações",
          value: (kpis.data?.reprovadas ?? 0).toLocaleString("pt-BR"),
          hint: "Ofertas reprovadas",
        },
        {
          label: "Aprovadas",
          value: (kpis.data?.aprovadas ?? 0).toLocaleString("pt-BR"),
          hint: "Para comparação",
        },
        {
          label: "Em aberto",
          value: (kpis.data?.em_aberto ?? 0).toLocaleString("pt-BR"),
          hint: "Sem decisão registrada",
        },
        {
          label: "Conversão geral",
          value: `${(kpis.data?.conversao_pct ?? 0).toLocaleString("pt-BR")}%`,
          hint: "Aprovadas sobre decididas",
        },
      ]}
      queryKey="motivos-perda"
      fetchRows={async (busca) => {
        let query = supabase
          .from("v_motivos_perda")
          .select("*")
          .order("reprovacoes", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("motivo", `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="motivo"
      campoValor="reprovacoes"
      buscaPlaceholder="Buscar motivo"
      chartTitle="Distribuição dos motivos"
      chartDescription="Dez motivos com mais reprovações na base."
      tableTitle="Detalhamento por motivo"
      tableDescription="Volume, participação e concentração por cliente e rota."
      colunas={[
        { key: "motivo", label: "Motivo" },
        { key: "reprovacoes", label: "Reprovações", tipo: "numero" },
        { key: "participacao_pct", label: "Participação", tipo: "pct" },
        { key: "cliente_recorrente", label: "Cliente recorrente" },
        { key: "rota_recorrente", label: "Rota recorrente" },
      ]}
    />
  );
}
