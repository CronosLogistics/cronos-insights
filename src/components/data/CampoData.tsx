import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Input de data opcional com botão de limpar (mesmo padrão do Dashboard). */
export function CampoData({
  label,
  value,
  onValueChange,
  carregando = false,
}: {
  label: string;
  value: string | null;
  onValueChange: (valor: string | null) => void;
  carregando?: boolean;
}) {
  if (carregando) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    );
  }

  const temConteudo = Boolean(value);

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="relative w-full">
        <Input
          type="date"
          value={value ?? ""}
          onChange={(event) => {
            const v = event.target.value;
            onValueChange(v || null);
          }}
          className={cn(temConteudo && "pr-9")}
        />
        {temConteudo ? (
          <button
            type="button"
            aria-label={`Limpar ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onValueChange(null)}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
