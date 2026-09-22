import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Texto: A–Z / Z–A. Número: crescente / decrescente. */
export type TipoOrdenacao = "texto" | "numero";
export type DirecaoOrdenacao = "asc" | "desc";

export type EstadoOrdenacao<K extends string = string> = {
  chave: K;
  direcao: DirecaoOrdenacao;
};

export type DefColunaOrdenacao<T> = {
  tipo: TipoOrdenacao;
  /** Extrai o valor bruto para comparar; padrão: propriedade com o mesmo nome da chave. */
  valor?: (linha: T) => unknown;
};

export type ColunasOrdenacao<T, K extends string = string> = Record<K, DefColunaOrdenacao<T>>;

function valorNulo(valor: unknown) {
  return valor == null || valor === "";
}

export function compararValores(
  a: unknown,
  b: unknown,
  tipo: TipoOrdenacao,
  direcao: DirecaoOrdenacao,
): number {
  let cmp = 0;

  if (tipo === "numero") {
    const na = valorNulo(a) || Number.isNaN(Number(a)) ? null : Number(a);
    const nb = valorNulo(b) || Number.isNaN(Number(b)) ? null : Number(b);
    if (na === null && nb === null) cmp = 0;
    else if (na === null) cmp = 1;
    else if (nb === null) cmp = -1;
    else cmp = na - nb;
  } else {
    const sa = valorNulo(a) ? "" : String(a);
    const sb = valorNulo(b) ? "" : String(b);
    cmp = sa.localeCompare(sb, "pt-BR", { sensitivity: "base", numeric: true });
  }

  return direcao === "asc" ? cmp : -cmp;
}

/**
 * Ordenação client-side para tabelas. A seta cicla asc ↔ desc na coluna clicada.
 * Passe o resultado a `usePaginacao` para paginar já ordenado.
 */
export function useOrdenacaoTabela<T, K extends string>(
  linhas: readonly T[] | null | undefined,
  colunas: ColunasOrdenacao<T, K>,
) {
  const [ordenacao, setOrdenacao] = useState<EstadoOrdenacao<K> | null>(null);
  const colunasRef = useRef(colunas);
  colunasRef.current = colunas;

  const ordenadas = useMemo(() => {
    const base = linhas ?? [];
    if (!ordenacao) return base as T[];

    const def = colunasRef.current[ordenacao.chave];
    if (!def) return base as T[];

    return [...base].sort((a, b) => {
      const va = def.valor
        ? def.valor(a)
        : (a as Record<string, unknown>)[ordenacao.chave];
      const vb = def.valor
        ? def.valor(b)
        : (b as Record<string, unknown>)[ordenacao.chave];
      return compararValores(va, vb, def.tipo, ordenacao.direcao);
    });
  }, [linhas, ordenacao]);

  const alternar = (chave: K) => {
    setOrdenacao((atual) => {
      if (!atual || atual.chave !== chave) return { chave, direcao: "asc" };
      return { chave, direcao: atual.direcao === "asc" ? "desc" : "asc" };
    });
  };

  const chaveReset = ordenacao ? `${ordenacao.chave}:${ordenacao.direcao}` : "nenhuma";

  return { ordenadas, ordenacao, alternar, chaveReset };
}

/** Cabeçalho clicável com seta de direção ao lado do nome da coluna. */
export function CabecalhoOrdenavel<K extends string>({
  label,
  coluna,
  ordenacao,
  onOrdenar,
  className,
  align = "left",
}: {
  label: ReactNode;
  coluna: K;
  ordenacao: EstadoOrdenacao<K> | null;
  onOrdenar: (chave: K) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const ativo = ordenacao?.chave === coluna;
  const Icon = ativo ? (ordenacao.direcao === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  const rotuloAria = typeof label === "string" ? label : coluna;

  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          align === "right" && "ml-auto flex-row-reverse",
          ativo ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onOrdenar(coluna)}
        aria-label={`Ordenar por ${rotuloAria}`}
      >
        <span>{label}</span>
        <Icon className={cn("size-3.5 shrink-0", ativo ? "opacity-100" : "opacity-50")} aria-hidden />
      </button>
    </TableHead>
  );
}

/** Colunas padrão das tabelas de ranking analítico (rotas, agentes, etc.). */
export const COLUNAS_RANKING = {
  item: { tipo: "texto" as const },
  rotas: { tipo: "numero" as const },
  aprovadas: { tipo: "numero" as const },
  reprovadas: { tipo: "numero" as const },
  emAnalise: { tipo: "numero" as const },
  conversao: { tipo: "numero" as const },
};

export const COLUNAS_MOTIVOS = {
  motivo: { tipo: "texto" as const },
  reprovadas: { tipo: "numero" as const },
  participacao: { tipo: "numero" as const },
};

/** Cruzamento com duas dimensões textuais + métricas numéricas. */
export function colunasCruzamento<T>(
  dim1: (linha: T) => unknown,
  dim2: (linha: T) => unknown,
) {
  return {
    dim1: { tipo: "texto" as const, valor: dim1 },
    dim2: { tipo: "texto" as const, valor: dim2 },
    rotas: { tipo: "numero" as const },
    aprovadas: { tipo: "numero" as const },
    reprovadas: { tipo: "numero" as const },
    emAnalise: { tipo: "numero" as const },
    conversao: { tipo: "numero" as const },
  };
}
