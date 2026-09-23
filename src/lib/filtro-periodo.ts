/** Filtro opcional por anos e/ou meses (seleção múltipla). */
export type FiltroPeriodo = {
  anos: number[];
  meses: number[];
};

export const PERIODO_VAZIO: FiltroPeriodo = {
  anos: [],
  meses: [],
};

export const MESES_OPCOES: ReadonlyArray<{ valor: number; rotulo: string }> = [
  { valor: 1, rotulo: "Janeiro" },
  { valor: 2, rotulo: "Fevereiro" },
  { valor: 3, rotulo: "Março" },
  { valor: 4, rotulo: "Abril" },
  { valor: 5, rotulo: "Maio" },
  { valor: 6, rotulo: "Junho" },
  { valor: 7, rotulo: "Julho" },
  { valor: 8, rotulo: "Agosto" },
  { valor: 9, rotulo: "Setembro" },
  { valor: 10, rotulo: "Outubro" },
  { valor: 11, rotulo: "Novembro" },
  { valor: 12, rotulo: "Dezembro" },
];

function listaNumeros(valor: unknown): number[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<number>();
  const out: number[] = [];
  for (const item of valor) {
    const n = typeof item === "number" ? item : Number(item);
    if (!Number.isInteger(n) || vistos.has(n)) continue;
    vistos.add(n);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

/** Anos válidos (ex.: 2020–2100). */
export function parseAnos(valor: unknown): number[] {
  return listaNumeros(valor).filter((n) => n >= 1990 && n <= 2100);
}

/** Meses válidos (1–12). */
export function parseMeses(valor: unknown): number[] {
  return listaNumeros(valor).filter((n) => n >= 1 && n <= 12);
}

export function parsePeriodo(raw: Record<string, unknown>): FiltroPeriodo {
  return {
    anos: parseAnos(raw["anos"]),
    meses: parseMeses(raw["meses"]),
  };
}

/** Args tipados para RPCs Supabase (`integer[]` ou null = sem filtro). */
export function periodoParaRpc(periodo: FiltroPeriodo): {
  p_anos: number[] | null;
  p_meses: number[] | null;
} {
  return {
    p_anos: periodo.anos.length > 0 ? periodo.anos : null,
    p_meses: periodo.meses.length > 0 ? periodo.meses : null,
  };
}

/** Gera lista de anos a partir de min/max ISO ou intervalo padrão. */
export function gerarAnosOpcoes(
  minimo?: string | null,
  maximo?: string | null,
): number[] {
  const agora = new Date().getFullYear();
  let ini = agora - 5;
  let fim = agora;
  const a = typeof minimo === "string" ? Number(minimo.slice(0, 4)) : NaN;
  const b = typeof maximo === "string" ? Number(maximo.slice(0, 4)) : NaN;
  if (Number.isFinite(a)) ini = a;
  if (Number.isFinite(b)) fim = b;
  if (fim < ini) [ini, fim] = [fim, ini];
  const out: number[] = [];
  for (let y = ini; y <= fim; y++) out.push(y);
  return out.length > 0 ? out : [agora];
}

/** Testa se uma data ISO cai no filtro ano/mês. */
export function dataNoPeriodo(
  iso: string | null | undefined,
  periodo: FiltroPeriodo,
): boolean {
  if (!iso) return periodo.anos.length === 0 && periodo.meses.length === 0;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const ano = d.getFullYear();
  const mes = d.getMonth() + 1;
  if (periodo.anos.length > 0 && !periodo.anos.includes(ano)) return false;
  if (periodo.meses.length > 0 && !periodo.meses.includes(mes)) return false;
  return true;
}
