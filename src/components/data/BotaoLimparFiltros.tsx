import { Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Limpa todos os filtros da tela; desativado quando já estão vazios/padrão. */
export function BotaoLimparFiltros({
  onLimpar,
  disabled,
  className,
}: {
  onLimpar: () => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onLimpar}
      disabled={disabled}
      className={cn("gap-2", className)}
    >
      <Eraser className="size-4" />
      Limpar filtros
    </Button>
  );
}
