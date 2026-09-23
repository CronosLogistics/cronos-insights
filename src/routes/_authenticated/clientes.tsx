import { createFileRoute } from "@tanstack/react-router";

import { RankingModule } from "@/components/data/RankingModule";
import { supabase } from "@/integrations/supabase/client";
import { useKpisGerais, type Linha } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Cronos Pricing Insights" },
      {
        name: "description",
        content:
          "Ficha de inteligência do cliente: recorrência de cotações, aprovações, reprovações e rotas preferidas.",
      },
      { property: "og:title", content: "Clientes — Cronos Pricing Insights" },
      {
        property: "og:description",
        content: "Comportamento de cotação e decisão por cliente.",
      },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const kpis = useKpisGerais();

  return (
    <RankingModule
      eyebrow="Inteligência"
      title="Ficha de inteligência do cliente"
      description="Perfil analítico do cliente com base no relatório de Ofertas: frequência de solicitações, aprovações e reprovações, conversão, rotas utilizadas e data da última cotação."
      kpisCarregando={kpis.isPending}
      kpis={[
        {
          label: "Clientes na base",
          value: (kpis.data?.clientes ?? 0).toLocaleString("pt-BR"),
          hint: "Clientes com cotação registrada",
        },
        {
          label: "Ofertas e revisões",
          value: (kpis.data?.ofertas ?? 0).toLocaleString("pt-BR"),
          hint: "Registros importados",
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
      queryKey="clientes"
      fetchRows={async (busca, periodo) => {
        let query = supabase
          .from("v_clientes")
          .select("*")
          .order("ofertas", { ascending: false })
          .limit(200);
        if (busca) query = query.ilike("cliente", `%${busca}%`);
        if (periodo.dataInicial) query = query.gte("ultima_oferta", periodo.dataInicial);
        if (periodo.dataFinal) query = query.lte("ultima_oferta", periodo.dataFinal);
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as unknown as Linha[];
      }}
      campoRotulo="cliente"
      campoValor="ofertas"
      buscaPlaceholder="Buscar cliente"
      chartTitle="Clientes com maior volume"
      chartDescription="Dez clientes com mais cotações na base."
      tableTitle="Carteira de clientes"
      tableDescription="Volume, decisões, conversão e recorrência por cliente."
      colunas={[
        { key: "cliente", label: "Cliente" },
        { key: "ofertas", label: "Ofertas", tipo: "numero" },
        { key: "aprovadas", label: "Aprovadas", tipo: "numero" },
        { key: "reprovadas", label: "Reprovadas", tipo: "numero" },
        { key: "em_aberto", label: "Em aberto", tipo: "numero" },
        { key: "conversao_pct", label: "Conversão", tipo: "pct" },
        { key: "rotas", label: "Rotas", tipo: "numero" },
        { key: "ultima_oferta", label: "Última cotação", tipo: "data" },
      ]}
    />
  );
}
