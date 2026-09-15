import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const TAMANHOS_PAGINA = [10, 20, 50] as const;
export type TamanhoPagina = (typeof TAMANHOS_PAGINA)[number];
export type TransicaoPaginacao = "next" | "prev" | "size";

const VAZIO: readonly never[] = [];

const ANIMACAO_TRANSICAO: Record<TransicaoPaginacao, string> = {
  next: "animate-in fade-in-0 slide-in-from-right-4 duration-300 ease-out fill-mode-both",
  prev: "animate-in fade-in-0 slide-in-from-left-4 duration-300 ease-out fill-mode-both",
  size: "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out fill-mode-both",
};

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
  const [transicao, setTransicao] = useState<TransicaoPaginacao>("size");
  const data = linhas ?? VAZIO;

  useEffect(() => {
    setTransicao("size");
    setPagina(1);
  }, [resetKey, data]);

  const total = data.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = data.slice(inicio, inicio + porPagina) as T[];
  const pageKey = `${paginaAtual}-${porPagina}-${inicio}`;

  return {
    visiveis,
    pagina: paginaAtual,
    setPagina: (nova: number) => {
      setTransicao(nova > paginaAtual ? "next" : nova < paginaAtual ? "prev" : "size");
      setPagina(nova);
    },
    porPagina,
    setPorPagina: (valor: TamanhoPagina) => {
      setTransicao("size");
      setPorPagina(valor);
      setPagina(1);
    },
    total,
    totalPaginas,
    inicio,
    pageKey,
    transicao,
  };
}

/** Envolve o corpo da tabela com animação conforme a origem da mudança. */
export function PaginatedContent({
  pageKey,
  direction = "size",
  children,
  className,
}: {
  pageKey: string | number;
  direction?: TransicaoPaginacao;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div key={pageKey} className={cn(ANIMACAO_TRANSICAO[direction], className)}>
      {children}
    </div>
  );
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
    <div className="flex flex-col gap-3 border-t border-border/60 pt-3 transition-opacity duration-300 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Linhas por página</span>
        <Select
          value={String(porPagina)}
          onValueChange={(v) => onPorPagina(Number(v) as TamanhoPagina)}
        >
          <SelectTrigger className="h-8 w-[72px] transition-colors duration-200">
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
        <span className="hidden transition-all duration-300 sm:inline">
          {inteiro(inicio + 1)}–{inteiro(fim)} de {inteiro(total)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-95 disabled:hover:scale-100"
          disabled={pagina <= 1}
          onClick={() => onPagina(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4 transition-transform duration-200" />
        </Button>
        <span
          key={`${pagina}/${totalPaginas}`}
          className="min-w-[4.5rem] animate-in fade-in-0 zoom-in-95 text-center text-xs text-muted-foreground duration-300"
        >
          {inteiro(pagina)} / {inteiro(totalPaginas)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 transition-all duration-200 ease-out hover:scale-[1.03] active:scale-95 disabled:hover:scale-100"
          disabled={pagina >= totalPaginas}
          onClick={() => onPagina(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4 transition-transform duration-200" />
        </Button>
      </div>
    </div>
  );
}
