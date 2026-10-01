import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { PanelBlock } from "@/components/data/Placeholders";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatarMesCurto, formatarMesTabela } from "@/lib/dashboard-analysis";
import {
  getOfertasPorMes,
  type FiltrosOfertasMes,
  type PontoOfertasMes,
} from "@/lib/ofertas-por-mes-fn";

const chartConfig = {
  ofertas: { label: "Ofertas", color: "var(--accent)" },
} satisfies ChartConfig;

/**
 * Gráfico de barras com a quantidade de ofertas por mês (independente de
 * aprovação/reprovação). Busca os dados pelo recorte informado ou recebe a
 * série pronta via `dados`.
 */
export function GraficoOfertasMes({
  titulo = "Ofertas por mês",
  descricao,
  filtros,
  dados,
  habilitado = true,
}: {
  titulo?: string;
  descricao: string;
  filtros?: FiltrosOfertasMes;
  dados?: PontoOfertasMes[];
  habilitado?: boolean;
}) {
  const consulta = useQuery({
    queryKey: ["ofertas-por-mes", filtros],
    queryFn: () => getOfertasPorMes({ data: filtros ?? {} }),
    enabled: habilitado && !dados,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const serie = dados ?? consulta.data;
  const chartData = (serie ?? []).map((p) => ({
    mes: formatarMesTabela(p.mes),
    mesCurto: formatarMesCurto(p.mes),
    ofertas: p.ofertas,
  }));

  if (chartData.length === 0 || (!dados && (consulta.isPending || consulta.isError))) {
    return null;
  }

  return (
    <PanelBlock title={titulo} description={descricao}>
      {!dados && consulta.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : !dados && consulta.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          Não foi possível carregar o gráfico agora.
        </p>
      ) : chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem dados para o gráfico no recorte atual.
        </p>
      ) : (
        <ChartContainer
          config={chartConfig}
          className={`aspect-auto h-72 w-full ${consulta.isFetching ? "opacity-70" : ""}`}
        >
          <LineChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              allowDecimals={false}
              tickFormatter={(v) => Number(v).toLocaleString("pt-BR")}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { mesCurto?: string } | undefined;
                    return row?.mesCurto ?? "";
                  }}
                  formatter={(value) => [Number(value).toLocaleString("pt-BR"), "Ofertas"]}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="ofertas"
              stroke="var(--color-ofertas)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      )}
    </PanelBlock>
  );
}
