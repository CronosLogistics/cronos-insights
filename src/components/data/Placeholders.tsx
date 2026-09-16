import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Bloco padrão de conteúdo: título, descrição e área reservada. */
export function PanelBlock({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex w-full min-w-0 flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}

/** Cartão de indicador (KPI) em estado de placeholder. */
export function KpiCardSkeleton({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {Icon ? <Icon className="size-4 text-accent" /> : null}
        </div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

/** Área reservada para gráficos futuros. */
export function ChartSkeleton({ bars = 12 }: { bars?: number }) {
  const heights = [38, 62, 45, 78, 55, 90, 48, 70, 60, 84, 52, 66];
  return (
    <div className="flex h-56 items-end gap-2" aria-hidden>
      {Array.from({ length: bars }).map((_, index) => (
        <Skeleton
          key={index}
          className="flex-1 rounded-md"
          style={{ height: `${heights[index % heights.length]}%` }}
        />
      ))}
    </div>
  );
}

export function DonutSkeleton() {
  return (
    <div className="flex h-56 items-center justify-center" aria-hidden>
      <div className="relative size-40 rounded-full bg-muted">
        <div className="absolute inset-[22%] rounded-full bg-card" />
      </div>
    </div>
  );
}

/** Estrutura de tabela analítica com colunas definidas e linhas em placeholder. */
export function TableSkeleton({ columns, rows = 6 }: { columns: string[]; rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column}
                className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/60 last:border-0">
              {columns.map((column) => (
                <td key={column} className="px-3 py-3">
                  <Skeleton className="h-3.5 w-full max-w-[140px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barra de filtros globais (período, cliente, rota) como estrutura visual. */
export function FilterBarSkeleton({ filters }: { filters: string[] }) {
  return (
    <div className="panel flex flex-wrap items-end gap-3 p-4">
      {filters.map((filter) => (
        <div key={filter} className="min-w-[150px] flex-1 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {filter}
          </p>
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Badge variant="secondary" className="mb-2">
        Filtros globais
      </Badge>
    </div>
  );
}

/** Cabeçalho de módulo com contexto de negócio. */
export function ModuleIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
