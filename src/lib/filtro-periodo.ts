/** Período opcional aplicado às análises (YYYY-MM-DD). */
export type FiltroPeriodo = {
  dataInicial: string | null;
  dataFinal: string | null;
};

export const PERIODO_VAZIO: FiltroPeriodo = {
  dataInicial: null,
  dataFinal: null,
};

/** Aceita apenas ISO `YYYY-MM-DD`; qualquer outro valor vira null. */
export function dataIso(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

export function parsePeriodo(raw: Record<string, unknown>): FiltroPeriodo {
  return {
    dataInicial: dataIso(raw["dataInicial"]),
    dataFinal: dataIso(raw["dataFinal"]),
  };
}
