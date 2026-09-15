import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TAMANHOS_PAGINA = [10, 20, 50, 100] as const;
export type TamanhoPagina = (typeof TAMANHOS_PAGINA)[number];

const VAZIO: readonly never[] = [];

function inteiro(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * Paginação client-side reutilizável nas tabelas analíticas.
 * `resetKey` volta para a página 1 quando a busca/filtro muda.
 */
export function usePaginacao<T>(
  linhas: readonly T[] | null | undefined,
  resetKey?: string | number,
) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<TamanhoPagina>(10);
  const data = linhas ?? VAZIO;

  useEffect(() => {
    setPagina(1);
  }, [resetKey, data]);

  const total = data.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = data.slice(inicio, inicio + porPagina) as T[];

  return {
    visiveis,
    pagina: paginaAtual,
    setPagina,
    porPagina,
    setPorPagina: (valor: TamanhoPagina) => {
      setPorPagina(valor);
      setPagina(1);
    },
    total,
    totalPaginas,
    inicio,
  };
}

export function TablePagination({
  pagina,
  totalPaginas,
  porPagina,
  total,
  inicio,
  onPagina,
  onPorPagina,
}: {
  pagina: number;
  totalPaginas: number;
  porPagina: number;
  total: number;
  inicio: number;
  onPagina: (pagina: number) => void;
  onPorPagina: (valor: TamanhoPagina) => void;
}) {
  if (total <= TAMANHOS_PAGINA[0]) return null;

  const fim = Math.min(inicio + porPagina, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Linhas por página</span>
        <Select
          value={String(porPagina)}
          onValueChange={(v) => onPorPagina(Number(v) as TamanhoPagina)}
        >
          <SelectTrigger className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAMANHOS_PAGINA.map((tamanho) => (
              <SelectItem key={tamanho} value={String(tamanho)}>
                {tamanho}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="hidden sm:inline">
          {inteiro(inicio + 1)}–{inteiro(fim)} de {inteiro(total)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={pagina <= 1}
          onClick={() => onPagina(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
          {inteiro(pagina)} / {inteiro(totalPaginas)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={pagina >= totalPaginas}
          onClick={() => onPagina(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
