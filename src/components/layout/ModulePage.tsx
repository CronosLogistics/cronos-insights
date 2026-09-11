import { BarChart3 } from "lucide-react";

import {
  ChartSkeleton,
  FilterBarSkeleton,
  KpiCardSkeleton,
  ModuleIntro,
  PanelBlock,
  TableSkeleton,
} from "@/components/data/Placeholders";
import { Badge } from "@/components/ui/badge";

/**
 * Estrutura visual reutilizada pelos módulos analíticos.
 * Nenhuma regra de negócio: apenas as áreas reservadas para a evolução futura.
 */
export function ModulePage({
  eyebrow,
  title,
  description,
  filters,
  kpis,
  tableColumns,
  chartTitle,
  chartDescription,
  tableTitle,
  tableDescription,
}: {
  eyebrow: string;
  title: string;
  description: string;
  filters: string[];
  kpis: string[];
  tableColumns: string[];
  chartTitle: string;
  chartDescription: string;
  tableTitle: string;
  tableDescription: string;
}) {
  return (
    <div className="space-y-6">
      <ModuleIntro eyebrow={eyebrow} title={title} description={description} />
      <FilterBarSkeleton filters={filters} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCardSkeleton key={kpi} label={kpi} icon={BarChart3} />
        ))}
      </div>

      <PanelBlock
        title={chartTitle}
        description={chartDescription}
        action={<Badge variant="secondary">Em construção</Badge>}
      >
        <ChartSkeleton />
      </PanelBlock>

      <PanelBlock
        title={tableTitle}
        description={tableDescription}
        action={<Badge variant="secondary">Em construção</Badge>}
      >
        <TableSkeleton columns={tableColumns} />
      </PanelBlock>
    </div>
  );
}
