import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/agentes")({
  head: () => ({
    meta: [
      { title: "Agentes — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Inteligência de agentes: participação nas cotações, efetividade e cobertura por origem.",
      },
      { property: "og:title", content: "Agentes — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Efetividade dos agentes no processo de cotação.",
      },
    ],
  }),
  component: AgentesPage,
});

function AgentesPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Inteligência"
      title="Inteligência de agentes"
      description="Participação dos agentes no exterior nas cotações do relatório de Ofertas: volume apresentado, decisões, conversão, países de origem cobertos e clientes atendidos."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Agentes envolvidos",
          value: (kpis.data?.agentes ?? 0).toLocaleString("pt-BR"),
          hint: "Agentes na base",
        },
        {
          label: "Ofertas na base",
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
      queryKey="agentes"
      fetchRows={async (busca) => {
        let query = supabase
          .from("v_agentes")
          .select("*")
          .order("ofertas", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("agente", `%${busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="agente"
      campoValor="ofertas"
      buscaPlaceholder="Buscar agente"
      chartTitle="Volume por agente"
      chartDescription="Dez agentes com mais ofertas na base."
      tableTitle="Ranking de agentes"
      tableDescription="Volume, conversão e cobertura geográfica por agente."
      colunas={[
        { key: "agente", label: "Agente" },
        { key: "ofertas", label: "Ofertas", tipo: "numero" },
        { key: "aprovadas", label: "Aprovadas", tipo: "numero" },
        { key: "reprovadas", label: "Reprovadas", tipo: "numero" },
        { key: "conversao_pct", label: "Conversão", tipo: "pct" },
        { key: "origens", label: "Países de origem", tipo: "numero" },
        { key: "clientes", label: "Clientes", tipo: "numero" },
      ]}
    />
  );
}
