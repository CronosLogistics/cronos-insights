import { CampoData } from "@/components/data/CampoData";
import { cn } from "@/lib/utils";

/** Par de datas opcionais (início / fim) para limitar o período da análise. */
export function FiltroPeriodo({
  dataInicial,
  dataFinal,
  onDataInicialChange,
  onDataFinalChange,
  carregando = false,
  className,
}: {
  dataInicial: string | null;
  dataFinal: string | null;
  onDataInicialChange: (valor: string | null) => void;
  onDataFinalChange: (valor: string | null) => void;
  carregando?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <CampoData
        label="Data inicial"
        value={dataInicial}
        onValueChange={onDataInicialChange}
        carregando={carregando}
      />
      <CampoData
        label="Data final"
        value={dataFinal}
        onValueChange={onDataFinalChange}
        carregando={carregando}
      />
    </div>
  );
}
